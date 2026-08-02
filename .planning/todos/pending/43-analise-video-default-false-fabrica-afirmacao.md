---
id: 43-analise-video-default-false-fabrica-afirmacao
created: 2026-08-02
source: Phase 43 / checkpoint 43-07 (medido pela primeira escrita pos-enforcement)
priority: medium
resolves_phase: 47
tags: [lgpd, consentimento, schema, default, bd-2, consol-03, m8-consent]
---

# `autorizacao_analise_video` e `NOT NULL DEFAULT false` — e isso fabrica uma afirmacao

**Medido:** 2026-08-02, no checkpoint 43-07, pelo smoke do caminho feliz — a
PRIMEIRA escrita pos-enforcement de `public.autorizacoes`.

## O fato

```
autorizacao_analise_video:  NOT NULL  DEFAULT false
```

Distribuicao viva em 2026-08-02 (17 linhas): **0 com NULL**, 14 com `false`, 3 com `true`.

## Por que isso e um defeito, e nao um detalhe

O modulo `supabase/functions/_shared/autorizacoes-registro.ts` esta CORRETO e faz
exatamente o que o BD-2 manda: **nunca emite a chave**. O docblock dele diz, em
voz alta, por que:

> `autorizacao_analise_video` — a chave NUNCA e emitida (BD-2 / CONSENT-05). (…)
> Emitir `false` tambem estaria errado: `false` e uma afirmacao sobre uma pergunta
> que deixou de ser feita.

Mas o `DEFAULT false` da COLUNA reintroduz o defeito uma camada abaixo: o Postgres
preenche `false` sozinho, e a linha passa a AFIRMAR que o titular respondeu "nao"
a uma pergunta que o formulario nao faz mais desde a Phase 43. O codigo se absteve;
o banco respondeu por ele.

**E a mesma classe de defeito que o cabecalho da `20260801000001` condena por tres
paragrafos** a respeito do `policy_version NOT NULL DEFAULT 'v1.0-2026-04'`
(`20260421000001:190`): um DEFAULT que faz toda linha afirmar retroativamente algo
que ninguem declarou, de forma inauditavel. A Phase 43 tomou o cuidado de fazer
suas QUATRO colunas novas nullable-e-sem-DEFAULT exatamente por isso — e a coluna
pre-existente continua fazendo o oposto ao lado delas.

**Consequencia medivel:** com `historicas_com_null = 0`, "respondeu nao" e "nunca
foi perguntado" sao INDISTINGUIVEIS nesta coluna. Ontem e daqui pra frente. E a
ausencia exata do discriminador que o SC#1 da Phase 43 existe para criar.

## Por que NAO foi corrigido no 43-07

Escopo declarado. A migration `20260801000001` escreve escopo negativo explicito:

> ⚠ E AS 3 POLICIES VIVAS (…) **Nao corrigir aqui.**
> `autorizacao_analise_video` (…) A COLUNA PERMANECE, com os valores historicos
> INTACTOS (…) O eventual DROP e decisao da Phase 47 (CONSOL-03), onde ja existe
> portao destrutivo previsto.

Mexer nessa coluna no 43-07 seria ampliar o escopo de um checkpoint de PROD sem
plano — precisamente o movimento que esta fase existe para nao fazer.

## O que fazer na Phase 47 (CONSOL-03)

A decisao do DROP ja esta agendada para la. Se o DROP acontecer, este todo morre
junto. Se a decisao for PRESERVAR a coluna, entao ela precisa de:

```sql
ALTER TABLE public.autorizacoes
  ALTER COLUMN autorizacao_analise_video DROP DEFAULT,
  ALTER COLUMN autorizacao_analise_video DROP NOT NULL;
```

Ambos ADITIVOS/corretivos e reversiveis — nenhum valor historico e tocado. A partir
dai, linha nova nasce NULL e o NULL volta a significar "nao foi perguntado", que e
a unica leitura honesta.

⚠ **Nao fazer back-fill** dos `false` existentes para NULL. Seria apagar o registro
de que a pergunta um dia foi feita, e a Phase 43 inteira se apoia no principio
inverso: a ausencia e o registro honesto, nunca uma reescrita retroativa.

## Relacionado

- `.planning/phases/43-consentimentos-honestos-pol-tica-de-reten-o/43-07-SUMMARY.md` — a medicao
- BD-2, em `.continue-here.md` da Phase 43 — a decisao travada do operador
- `20260801000001_p43_consent_prova_e_marketing.sql` secao (1) — a condenacao do idioma
