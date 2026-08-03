---
id: 42-anon-execute-definer-sistemico
created: 2026-07-30
source: Phase 42 / Plano 42-06 (achado da asserção (c) do smoke) + varredura de catálogo no checkpoint da 42-07
priority: high
tags: [seguranca, authz, security-definer, anon, default-acl, postgrest, m8, fase-propria]
---

# `anon` tem EXECUTE em 61 funções `SECURITY DEFINER`, e o guard idiomático falha ABERTO

**Artefato completo com a triagem função-a-função:** `docs/compliance/anon-execute-definer-audit.md`

## Por que existe

Dois defeitos independentes que se compõem:

1. **`pg_default_acl` de `public` concede EXECUTE a `anon` em todo `CREATE FUNCTION`**, como grant
   direto e nomeado. O idioma usado em quase toda migration do repo —
   `REVOKE ALL ON FUNCTION … FROM PUBLIC` — remove um grant de `PUBLIC` que nunca existiu e deixa
   `anon=X` de pé. Só 2 migrations na história revogam de `anon` nominalmente.
2. **O guard idiomático é NULL-cego:** `IF v_role NOT IN ('rh','administrador')` com `v_role` NULL
   (chamador sem JWT) avalia NULL, e um `IF` NULL **não é tomado**. O guard só recusa claim
   presente-e-errada; ausente, passa. Em `SECURITY DEFINER` isso é grave porque DEFINER **bypassa
   RLS** — o guard do corpo é o único controle.

Corrigido apenas nos 3 RPCs do Art. 20 (migration `20260730000002`) e, para
`varrer_retry_notificacoes`, na `20260730000003` do plano 42-07. **O resto do catálogo segue como
está.**

## Estado medido (catálogo vivo, 2026-07-30)

| | |
|---|---|
| DEFINER em `public` com EXECUTE p/ `anon` | **61** |
| chamáveis via PostgREST | **39** |
| **confirmadas sem guard algum** (corpo lido) | **3** — `varrer_retry_notificacoes` (dispara e-mail), `testar_webhook` (dispara webhook), `limpar_logs_antigos` (`DELETE` em `logs_auditoria`) |
| guard confirmado íntegro | 1 — `publish_vaga` (`42501`) |
| **inconclusivas**, exigem revisão de ordem do corpo | 12 — inclui `registrar_decisao`, que grava decisão final e dispara e-mail ao candidato (toca RNF-07a / D-15) |
| provavelmente `anon` por desenho | ~15 do fluxo público de cadastro/avaliação |

**Fechadas por migration desta fase:** `varrer_retry_notificacoes` (pela 42-07).
**Seguem abertas e confirmadas:** `testar_webhook`, `limpar_logs_antigos`.

## O que NÃO foi feito, de propósito

- **Nenhuma das 12 inconclusivas foi sondada com ID real.** Fazê-lo arriscaria gravar decisão em
  candidato real, alterar avaliação humana ou disparar notificação. A prova correta é leitura de
  corpo, não experimento em PROD.
- **Nenhuma correção aplicada além do escopo do Art. 20.** Decisão do operador em 2026-07-30:
  triar agora, corrigir em fase própria — a alternativa (corrigir as 28 dentro da Phase 42) foi
  recusada porque cada guard corrigido precisa de prova própria (a 42-06 levou 4 rodadas para 3
  funções) e estouraria a fase.

## Definition of done da fase de correção

1. Ordem do corpo revisada nas 12 inconclusivas; cada guard classificado íntegro ou NULL-cego.
2. Migration corretiva: `coalesce(role,'')` + rejeição de `auth.uid() IS NULL` nas que falham
   aberto; `REVOKE ALL ON FUNCTION … FROM anon` em tudo que não seja `anon` por desenho.
3. Para cada função do fluxo público que **escreve**, decisão explícita `anon` vs `authenticated`
   (cadastro público é anônimo; responder avaliação não deveria ser).
4. **Gate durável** — sem ele o achado volta. Preferir
   `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;` (elimina a
   classe na origem) a uma asserção de CI que só detecta depois.
5. Asserção de fail-closed por função corrigida, no padrão da asserção (i) do
   `p42_revisao_art20_smoke.sql`: papel `authenticated` **sem claim** tem de receber `42501`.

## Nota de processo

A P41 já sabia revogar de `anon` nominalmente, e a 42-06 regrediu contra esse padrão vivo.
Conhecimento correto existindo em UMA migration não impede recorrência — só um gate impede. Mesmo
formato do débito `processo-origem-do-drift-desconhecida`.
