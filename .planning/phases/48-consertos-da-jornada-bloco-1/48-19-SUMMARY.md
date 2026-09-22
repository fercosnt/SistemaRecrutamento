---
phase: 48-consertos-da-jornada-bloco-1
plan: 19
subsystem: avaliacao
status: complete
tags: [jorn-06, big-five, devolutiva, edge-function, tabs, prod, defeito-30, defeito-31]

requires: [48-05]
provides:
  - "gerar-devolutiva-bigfive v25 em PROD: texto oficial da faixa, IA desligada (PERSONALIZACAO_IA_ATIVA=false), modelo_ia nulo e prompt_version 'template_oficial' — bundle = disco byte a byte (sha256, 9 arquivos)"
  - "DevolutivaBigFiveView no ar (index-Cicf4ORj.js): as cinco abas clicáveis e legíveis, sem tocar o componente base"
  - "p48_prova_prod.sql: p1_devolutiva_gerada corrigida (candidatura_id) e p2_devolutiva_template_oficial nova, provada mordendo a linha defeituosa real"
affects: [48-18]

actuals:
  tasks: 4
  commits: 4
plan_head_before: dd6089e3

tech-stack:
  added: []
  patterns:
    - "Desligar um caminho de IA por constante exportada + teste que reprova se ela for religada — o caminho e os imports ficam, o bundle mantém o mesmo conjunto de arquivos"
    - "A linha persistida diz como o texto nasceu (modelo_ia nulo / prompt_version marcador) — e a prova em PROD lê esse marcador"
    - "Layout que o jsdom não vê: harness temporário (Vite + Playwright) com o componente real, elementFromPoint no centro de cada alvo, contraprova com as classes antigas no mesmo navegador"

key-files:
  created:
    - .planning/phases/48-consertos-da-jornada-bloco-1/48-19-PLAN.md
  modified:
    - supabase/functions/gerar-devolutiva-bigfive/index.ts
    - supabase/functions/gerar-devolutiva-bigfive/__tests__/index.test.ts
    - src/features/avaliacao/components/DevolutivaBigFiveView.tsx
    - src/features/avaliacao/components/__tests__/DevolutivaBigFiveView.test.tsx
    - supabase/tests/p48_prova_prod.sql
    - .planning/phases/48-consertos-da-jornada-bloco-1/48-PROVA-PROD.md
    - .planning/phases/48-consertos-da-jornada-bloco-1/48-18-PLAN.md
    - .planning/phases/48-consertos-da-jornada-bloco-1/deferred-items.md
    - CLAUDE.md

key-decisions:
  - "Operador (2026-09-21): servir o template oficial da faixa até haver prompt corrigido e testado; as cinco abas clicáveis e legíveis só na view; não fechar o JORN-06 sem os dois"
  - "Operador (2026-09-22): a frase negada «não é teste psicológico» do rodapé FICA — registrada como exceção explícita no CLAUDE.md"
  - "As 2 devolutivas já gravadas em PROD (ambas de conta de teste) NÃO foram tocadas — a da +claude5 é a evidência do Defeito 30"
  - "Deploy da EF pelo operador (efdeploy.cjs, Keychain), front pelo push autorizado — dois canais, cada um conferido no ar"

requirements-completed: []

coverage:
  - id: D1
    description: "Com a IA desligada, cada página é o template oficial exato, callAi não é chamado e a linha grava modelo_ia nulo / 'template_oficial'"
    requirement: JORN-06
    verification:
      - kind: unit
        ref: "deno test gerar-devolutiva-bigfive — 16 passed; mordida: com a constante em true, 3 reprovam"
        status: pass
    human_judgment: false
  - id: D2
    description: "As cinco abas recebem clique em 375 px e 1280 px"
    requirement: JORN-06
    verification:
      - kind: unit
        ref: "vitest DevolutivaBigFiveView — 5 passed; mordida do teste de causa contra as classes antigas"
        status: pass
      - kind: other
        ref: "harness Vite + Playwright com o componente real: depois 5/5 recebem clique nas duas larguras; contraprova com as classes antigas — 1280 px: só «Sensibilidade Emocional» coberta (o relato); 375 px: 4 de 5 cobertas pelo tabpanel"
        status: pass
    human_judgment: false
  - id: D3
    description: "Os dois consertos no ar"
    requirement: JORN-06
    verification:
      - kind: other
        ref: "get_edge_function: gerar-devolutiva-bigfive v25 = disco (sha256 dos 9 arquivos, commit 666a43fb), marcadores presentes, diag-auth 0×; front index-Cicf4ORj.js com devolutiva-abas e as classes novas; origin/main..HEAD vazio após o push"
        status: pass
    human_judgment: false
  - id: D4
    description: "Uma devolutiva NOVA de conta de teste, depois do deploy, serve o texto oficial e as abas abrem"
    requirement: JORN-06
    verification: []
    human_judgment: true
    rationale: "Exige submissão de Big Five por pessoa — é o passo (m) da sessão 2 do 48-18, medido pela p2_devolutiva_template_oficial"

completed: 2026-09-22
---

# Phase 48 Plan 19: devolutiva — texto oficial da faixa e abas clicáveis (Defeitos 30/31) Summary

**A primeira devolutiva gerada pelo caminho real, depois do conserto do 401, inventava nome, percentil e placeholder, e tinha uma aba que não recebia clique. Agora cada página serve o texto oficial da faixa, sem nenhuma chamada de IA, e a linha gravada diz isso (`modelo_ia` nulo, `prompt_version = 'template_oficial'`). As cinco abas abrem em qualquer largura. Os dois consertos estão no ar e conferidos: a EF na v25, idêntica ao disco byte a byte, e o front no build `index-Cicf4ORj.js`. Falta a prova com uma devolutiva nova, que é o passo (m) da sessão 2 do 48-18.**

## O que foi feito

| Task | Entrega | Commit |
|---|---|---|
| 1 | EF: `PERSONALIZACAO_IA_ATIVA = false`; página = `BAND_TEMPLATES[dim][banda]`; `callAi` nunca chamado; prompt não resolvido; marcadores de persistência; 4 testes novos | `eba5cd27` |
| 2 | View: lista `h-auto w-full flex-wrap`, gatilhos `h-auto min-h-[44px] flex-none` com contraste sobre o vidro; 2 testes | `c5e695f9` |
| 3 | Prova: `p1_devolutiva_gerada` corrigida, `p2_devolutiva_template_oficial` nova; sessão 1 registrada; passo (m) no 48-18 | `cf010939` |
| review | SDKs de IA só nascem com a IA ligada (LOW); comentário falso sobre o `efdeploy.cjs` corrigido (LOW); teste de causa com `flex-none` (NIT) | `666a43fb` |
| 4 | Deploy: EF v25 pelo operador; push autorizado; os dois conferidos no ar | — |

## Desvios

**1. [Teste] A `p1_devolutiva_gerada` do 48-18 não conseguia passar.** Em `devolutivas_candidato`, a coluna `candidato_id` guarda o uid do Auth, e a consulta comparava com `candidatos.id`. A conferência de forma da Task 1 do 48-18 verificou que a coluna **existia**, mas não o que ela **guarda**. Corrigido para filtrar por `candidatura_id`.

**2. [Escopo] O Defeito 31 era maior no celular.** O operador viu uma aba coberta, no desktop. No navegador, em 375 px, eram 4 de 5. O conserto cobre as duas larguras.

**3. [Review] Dependência escondida da `OPENAI_API_KEY`.** Com a IA desligada, o construtor do SDK da OpenAI ainda rodava, e ele lança erro sem chave. Corrigido antes do deploy.

## Deferido (`deferred-items.md`)

- O cabeçalho do `efdeploy.cjs` afirma uma checagem de fechamento de imports que não existe.
- A ligação do `Deno.serve` com a IA desligada não tem teste.
- Quando a IA for religada, `modelo_ia` e `prompt_version` precisam vir do `resolved`, e não de literais.
- O rodapé ainda diz «revisado por psicólogo(a)», e o fallback do front tem o placeholder «Dra. [Nome]». Isso aguarda decisão. A frase negada ficou decidida: **fica**.

## Não tocado

As 2 devolutivas já gravadas em PROD, ambas de conta de teste. Nenhum candidato real viu texto inventado.
