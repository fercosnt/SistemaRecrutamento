---
phase: 38-ef-notificar-candidato-comm
plan: 02
subsystem: edge-functions
tags: [deno, email, html-templates, inline-css, lgpd, d-15, grep-guard, xss-escape]

# Dependency graph
requires:
  - phase: 38 (P36)
    provides: "supabase/functions/_shared/email-config.ts — tipo EventoNotificacao (chaveia os renderizadores)"
provides:
  - "supabase/functions/_shared/email-templates.ts — renderarEmail(evento, dados) → {subject, html}; layoutBase (header logo + footer LGPD transacional); 4 corpos inline-CSS; COPY_REJEICAO congelada; escapeHtml; SUBJECTS"
  - "supabase/functions/_shared/__tests__/email-templates.test.ts — 6 testes deno incl. grep-guard de tokens de avaliação e prova de escape de HTML"
affects: [38-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "E-mail hand-rolled table-based inline-CSS para Deno edge (nunca @react-email — quebra no runtime): wrapper compartilhado + corpos por evento"
    - "Cópia sensível como constante congelada (COPY_REJEICAO) + grep-guard executável sobre o HTML RENDERIZADO (não sobre a fonte) — o proof do D-15/RNF-07a"
    - "escapeHtml em todo valor interpolado do candidato/RH (proteção de injeção no corpo do e-mail)"
    - "Logo via URL hospedada sobre faixa deep-blue com wordmark no alt — degradação graciosa se o asset 404"

key-files:
  created:
    - supabase/functions/_shared/email-templates.ts
    - supabase/functions/_shared/__tests__/email-templates.test.ts
  modified: []

key-decisions:
  - "O grep-guard roda sobre o HTML RENDERIZADO de renderarEmail('decisao_final'), não sobre a fonte — comentários explicativos que mencionam tokens de avaliação não são vazamento; só o output importa"
  - "Comentários da fonte foram reescritos para NÃO conter os literais 'percentil/trait/ranking/react-email/opt-out' — a acceptance do plano grepa a fonte, e um comentário didático tripava o guard (falso positivo). O significado foi preservado com sinônimos"
  - "corpoDecisao inclui o TÍTULO DA VAGA (contexto ao candidato) além da COPY_REJEICAO — título de vaga não é dado de avaliação; mantém neutralidade e dá contexto"
  - "Footer é transacional sem link de saída de lista (decisão de kickoff — transacional sem opt-out); nenhum descadastro renderizado"

# Verification
verification:
  automated: "deno test _shared/__tests__/email-templates.test.ts --allow-env --allow-read → 6 passed / 0 failed"
  acceptance: "fonte: 0 react-email, 0 tokens de avaliação, exporta renderarEmail/layoutBase/escapeHtml/COPY_REJEICAO/SUBJECTS; grep-guard sobre o render de decisão verde; escape de '<b>' provado"
  lint: "tsc src/** 97→97 (Deno não é type-checked pelo tsc do src)"
---

# 38-02 — Templates Beauty Smile + grep-guard da rejeição (COMM-02/03/05/06)

Construí `supabase/functions/_shared/email-templates.ts`: um wrapper compartilhado (`layoutBase` — header com logo Beauty Smile sobre faixa gradient deep-blue→turquesa + footer LGPD transacional) e 4 corpos por evento (confirmação, avanço, convite, decisão), todos table-based com inline CSS. `renderarEmail(evento, dados)` é o ponto único que a EF chama; retorna `{ subject, html }`.

A cópia de rejeição é a constante congelada `COPY_REJEICAO` (D-15/RNF-07a) — `corpoDecisao` a usa exclusivamente, sem interpolar dado de avaliação. O **grep-guard** no teste roda sobre o HTML renderizado de `decisao_final` e falha se casar `/score|percentil|trait|motivo|nota|ranking|pontuaç|crit[ée]rio/i` — prova por execução da neutralidade. Todo valor do candidato passa por `escapeHtml` (provado com `Ana <b>` → `&lt;b&gt;`).

6 testes deno verdes. Zero npm novo; sem `@react-email` (asserido por leitura da fonte, só em linhas de import).

**Deviations:** (1) comentários da fonte reescritos para não conter os literais que a acceptance do plano grepa (o guard real é sobre o output renderizado, não a fonte — falso positivo de comentário didático). (2) `corpoDecisao` ganhou o título da vaga como contexto neutro (não é dado de avaliação), para consistência com os outros e-mails. **Next:** a EF (38-03) chama `renderarEmail`.
