---
phase: 45
plan: 01
subsystem: sondas-prod
status: complete
tags: [lgpd, medicao, read-only, dry-run, portao-destrutivo, checkpoint-orquestrador]
requirements: [ERASE-02, ERASE-03, ERASE-04, ERASE-08, ERASE-10]
requires:
  - MCP Supabase `execute_sql` (orquestrador/main thread — subagentes não recebem estes tools)
  - CLI `npx supabase` autenticado (keychain do macOS, NÃO env var)
provides:
  - .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-SONDAS-PROD.md (fato datado, com precedência sobre migrations do repo)
  - EF `exportar-meus-dados` em PROD na version 2 (pós-correção) — G2 fechado
affects:
  - 45-04 (nomes vivos das CHECKs; fixture para TRÊS tabelas em zero, não duas)
  - 45-07 (a S1 já tem dry-run executado; severação por enumeração dinâmica, não lista fixa)
  - 45-10 (a ordem Storage→Postgres→Auth NÃO é imposta pela plataforma; 23503 como CLASSE)
  - 45-11 (o portão NÃO abre enquanto G1 estiver aberto)
  - 46 (`ai-logs-retention-cleanup` já apaga de `ai_call_logs` diariamente)
tech-stack:
  added: []
  patterns:
    - "dry-run por bloco `DO` terminando em `RAISE EXCEPTION` — reverte a transação INTEIRA, DDL inclusive, e devolve a medição na mensagem"
    - "medir sobre formas de dado REAIS em rollback, em vez de criar/limpar conta descartável: sem resíduo possível, porque não há limpeza que possa falhar"
    - "asserção negativa de deploy por comparação campo a campo da listagem antes/depois (version, sha256, verify_jwt, e as outras 17 EFs intactas)"
key-files:
  created:
    - .planning/phases/45-motor-de-exclus-o-anonimiza-o/45-SONDAS-PROD.md
---

# Phase 45 Plano 01: Sondas de PROD — Summary

**3/3 tarefas.** Todas `checkpoint:human-verify` — o plano é 100% orquestrador por desenho
(subagentes GSD não recebem os tools MCP do Supabase).

## O que este plano produziu

Um fato datado que **tem precedência** sobre os arquivos de migration do repositório, sobre
`STACK.md`/`ARCHITECTURE.md` e sobre as assunções da `45-RESEARCH.md`. Não é documentação: é a
medição que as migrations das waves 3–4 vão consumir.

## As três descobertas que mudam a fase

**1 · A plataforma NÃO protege a ordem.** `storage.objects` tem **uma** FK, para
`storage.buckets`. **Não existe FK para `auth.users`.** A frase de `REQUIREMENTS.md:25` — *"o
Supabase recusa deletar usuário que possua objetos no Storage"* — **não é um controle**. A ordem
`Storage → Postgres → Auth` é **disciplina que o motor impõe a si mesmo**, e o modo de falha é
**silencioso**: uma ordem errada não levanta erro, apenas órfã o blob para sempre. O teste do
45-10 tem de assertar o comportamento do motor, nunca esperar recusa da plataforma.

**2 · O bloqueio do `deleteUser` é transitivo, e varia por conta.** Titular puro:
`auth.users`→CASCADE→`candidatos`→CASCADE→`candidaturas`→**NO ACTION**→`historico_candidatura`
⇒ `23503`. Conta híbrida candidato+RH: bloqueou antes, em
`preferencias_notificacoes_created_by_fkey`. **Duas contas reais, dois bloqueadores diferentes.**
O motor tem de tratar `23503` como **classe** e enumerar FKs dinamicamente.

**3 · A S1 (D-45-11) está provada por execução.** `DROP NOT NULL` + FK recriada
`ON DELETE SET NULL` + severar `user_id` ⇒ `DELETE FROM auth.users` **sucesso**, com
`historico=5 · decisao_final=1 · candidaturas=9 · candidatos=22` **idênticos antes e depois**.
A asserção negativa do ERASE-08 vale, medida. E antes da S1 o `UPDATE user_id = NULL` devolveu
`23502` — **prova executada de que a migration é precondição aritmética, não preferência**.

## Uma inferência minha que a medição refutou — e ficou registrada

Depois da Sonda 4 eu escrevi que *"são sete colunas a severar"*. **Medido: as vinte FKs
`NO ACTION` para `auth.users` têm ZERO linha para os 21 titulares puros.**
`historico_candidatura.ator` é 0 porque **quem move etapa é o RH** — o titular nunca é ator.

A inferência errada foi **mantida no documento**, com a refutação ao lado, em vez de apagada. O
erro é instrutivo e específico: **li o catálogo e concluí sobre os dados sem olhar para os
dados.** É exatamente o modo de falha que as cinco sondas existem para eliminar, e ele me pegou
no meio delas.

## Método: por que o dry-run em rollback é melhor que a conta descartável

O plano previa criar conta descartável, sujá-la, medir e apagar. Executei por blocos `DO` que
terminam em `RAISE EXCEPTION`. Postgres tem **DDL transacional**, então até o `ALTER TABLE` da S1
foi exercitado e desfeito.

| | conta descartável | `DO` + `RAISE` |
|---|---|---|
| Resíduo se falhar no meio | conta órfã + objeto no bucket | **impossível** — não há limpeza, há rollback |
| Formas de dado | sintéticas | **reais** |
| Custo | queima conta e e-mail | zero |

**Vale como padrão para o dry-run do 45-11.**

## Verificação executada

| Gate | Resultado |
|---|---|
| Conferência automática dos 8 tokens do `45-SONDAS-PROD.md` | **OK** |
| Integridade pós-Sonda-6 (FK, nullability, 6 contagens) | **tudo idêntico ao pré-sonda** |
| `deno test supabase/functions/exportar-meus-dados/` (antes do deploy) | **20 passed \| 0 failed** |
| Deploy: comparação campo a campo antes/depois | `version 1→2` · `sha256 43a3297d…→2d05de28…` · `verify_jwt true` preservado |
| Asserção negativa do deploy | as outras **17 EFs** com `version` e `sha256` **idênticos** |
| `solicitacoes_dados` | **0 linhas** antes e depois de tudo |
| `npm run lint` (hook, todos os commits) | **97/97**, zero `--no-verify` |

## Checkpoint que permanece aberto

**G1 — exercitar o export ponta a ponta.** Exige sessão de navegador com login real de titular;
não é executável por agente. `solicitacoes_dados` segue em 0 linhas.

# ⚠ O portão destrutivo do 45-11 NÃO abre enquanto o G1 estiver aberto.

Não bloqueia as waves 2–4 (não-destrutivas ou revertíveis). Bloqueia **o apply**.

## Commits

| # | Hash | Conteúdo |
|---|------|----------|
| 1 | `3e28642` | Sondas 1–5 — 10 divergências, 3 bloqueantes |
| 2 | `d4d70da` | Estado do checkpoint da wave 1 |
| 3 | `67180bf` | Portão LGPD passa a medir CONSOL-04 em vez de data hard-coded |
| 4 | `0d72f1d` | Sonda 6 em transação revertida — S1 provada, auto-correção registrada |
| 5 | `48a7661` | G2 bloqueado por token (estado intermediário) |
| 6 | `9bdd9af` | **G2 FECHADO** — `exportar-meus-dados` v1 → v2 |

## Self-Check: PASSED

`45-SONDAS-PROD.md` existe em disco com as 6 sondas e a seção G1/G2; os 6 hashes existem em
`git log`; a version 2 da EF foi confirmada pela API depois do deploy, não presumida.
