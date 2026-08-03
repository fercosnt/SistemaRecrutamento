---
phase: 44
slug: exporta-o-acesso
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-03
---

# Phase 44 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derivada da `## Validation Architecture` da `44-RESEARCH.md`, com as duas armadilhas de
> configuração medidas pelo pattern-mapper contra o `vite.config.ts` vivo.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest **4.1.9** + happy-dom 20.10.6 (unit/component) · `deno test` (Edge Functions) · Playwright 1.56.1 (E2E — não usado nesta fase) |
| **Config file** | `vite.config.ts` (bloco `test:`) — `globals: true`, `environment: 'happy-dom'`, `setupFiles: ['./tests/setup.ts']` |
| **Quick run command** | `npx vitest run <caminho>` |
| **Full suite command** | `npm run test:run` |
| **Type gate** | `npm run lint` (= `tsc --noEmit`) — baseline de não-regressão **97 local / 104 CI** |
| **Estimated runtime** | ~40–70 s (suíte completa) |

### ⚠ Duas armadilhas de configuração — ambas verificadas no arquivo vivo

1. **`include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}']`** (`vite.config.ts:13`). Um teste fora de
   um diretório `__tests__/` **não roda e não falha** — ele simplesmente não existe para o runner.
   `docs/compliance/exportAllowlist.test.ts` seria invisível; o caminho correto é
   `docs/compliance/__tests__/exportAllowlist.test.ts`. Um teste que não roda é a forma mais barata
   de fabricar um falso verde, e esta fase inteira existe para impedir falsos verdes.

2. **Toda EF que importa de `https://esm.sh` precisa de uma linha literal no `exclude`**
   (`vite.config.ts:19-41`; há 15+ entradas, uma por EF, com comentário — o padrão é **literal,
   nunca glob de diretório**). Sem ela, `npm run test:run` quebra por resolução de módulo ESM.
   **`supabase/functions/exportar-meus-dados/**/*.test.ts` tem de entrar no MESMO commit que criar o
   teste da EF** — separá-los deixa a árvore vermelha entre dois commits.

---

## Sampling Rate

- **Após cada commit de tarefa:** `npx vitest run <arquivos tocados>` **+** `npm run lint`.
  O `.husky/pre-commit` congela o baseline em 97 e **morde antes do CI**.
- **Após cada wave:** `npm run test:run` (suíte completa) **+**
  `node docs/compliance/sql/gen-export-allowlist.cjs --check`.
- **Antes de `/gsd-verify-work`:** suíte verde **+** o smoke SQL `05-export-allowlist-drift.sql`
  executado pelo orquestrador contra PROD devolvendo **0 linhas** **+** a **prova de mordida**
  (par antes/depois colado no `44-VERIFICATION.md`).
- **Max feedback latency:** ~70 s.

---

## Per-Task Verification Map

> Task IDs a preencher pelo planner. A coluna que não pode ficar vazia é **Requirement**.

| Plan | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists |
|------|-------------|------------|-----------------|-----------|-------------------|-------------|
| candidato | EXPORT-01 | — | Clique dispara a mutation e os dois downloads (`.json` primeiro) | unit (component) | `npx vitest run src/features/privacidade/components/__tests__/PedirCopiaBloco.test.tsx` | ❌ W0 |
| candidato | EXPORT-01 | — | **Nenhum `<button disabled>` do bloco existe sem nó irmão de motivo visível** (asserção **estrutural**, não textual) | unit (component) | idem | ❌ W0 |
| candidato | EXPORT-01 | — | Falha da leitura de estado não derruba o bloco; o CTA renderiza e o servidor é a autoridade | unit (component) | idem | ❌ W0 |
| EF | EXPORT-02 | T-44-EXFIL | A EF projeta por allowlist e **nunca** `select('*')` | unit (Deno, `Deps` mockado) | `deno test supabase/functions/exportar-meus-dados/__tests__/index.test.ts` | ❌ W0 |
| EF | EXPORT-02 | T-44-TAMPER | `candidato_id` do corpo é **ignorado**; resolução vem de `auth.uid()` | unit (Deno) | idem | ❌ W0 |
| allowlist | EXPORT-02 | T-44-EXFIL | Segredos e `ai_call_logs` **ausentes** do artefato (asserção **negativa nomeada**, sem snapshot) | unit | `npx vitest run docs/compliance/__tests__/exportAllowlist.test.ts` | ❌ W0 |
| candidato | EXPORT-03 | T-44-URLLEAK | O signed URL **nunca** entra em estado, cache, arquivo ou `console.*` | unit (component + serviço) | `npx vitest run src/features/privacidade/components/__tests__/CurriculosBloco.test.tsx` | ❌ W0 |
| candidato | EXPORT-03 | — | O CV do titular é alcançável **ao vivo** | **manual / live UAT** | login de candidato real + clique | ❌ manual |
| allowlist | **EXPORT-04 (1)** | — | Chaves da allowlist sob snapshot inline; mudou ⇒ CI falha | unit | `npx vitest run docs/compliance/__tests__/exportAllowlist.test.ts` | ❌ W0 |
| allowlist | **EXPORT-04 (2)** | — | Coluna **nova** ou **sumida** no banco ⇒ smoke devolve ≥1 linha | **SQL smoke (orquestrador via MCP)** | `docs/compliance/sql/05-export-allowlist-drift.sql` | ❌ W0 |
| allowlist | **EXPORT-04 (prova)** | — | **Prova de que (2) morde** — remover uma linha do VALUES e ver falhar | **manual, evidenciado** | idem | ❌ W0 |
| RH | EXPORT-05 | — | `classifySlaDados === classifyRevisaoSla` (identidade de **referência**) | unit | `npx vitest run src/features/pedidos-dados/constants/__tests__/slaDados.test.ts` | ❌ W0 |
| RH | EXPORT-05 | — | Linha **não atendida** distinguível por canal **textual**, nunca por classe de cor | unit (component) | `npx vitest run src/features/pedidos-dados/components/__tests__/FilaPedidosDadosTable.test.tsx` | ❌ W0 |
| RH | EXPORT-05 | — | Config ausente / `0` / ordem invertida ⇒ faixa **degenerada**, nunca erro de tela | unit | idem | ❌ W0 |
| RH | EXPORT-05 | T-44-SCOPE | **Fila e contador do menu usam o MESMO predicado** (BD-8) | unit + SQL smoke | idem + inline sobre a RPC | ❌ W0 |
| RH | EXPORT-05 | — | Ordenação composta (não atendidos ASC → atendidos DESC) — o que torna o aviso de corte verdadeiro | SQL smoke (orquestrador) | inline sobre a RPC | ❌ W0 |
| allowlist | EXPORT-06 | — | `meta.versao` + `meta.consumidores` contendo "Phase 45" + `medido_em` | unit | `npx vitest run docs/compliance/__tests__/exportAllowlist.test.ts` | ❌ W0 |
| allowlist | EXPORT-06 | — | `gen-export-allowlist.cjs --check` sai **1** quando o JSON diverge da fonte | unit ou script | `node docs/compliance/sql/gen-export-allowlist.cjs --check` | ❌ W0 |
| allowlist | EXPORT-06 | — | **Coluna viva sem classificação ⇒ erro de fechamento** que falha a geração (BD-6) | unit | `npx vitest run docs/compliance/__tests__/exportAllowlist.test.ts` | ❌ W0 |
| candidato | — | T-44-XSS | HTML gerado escapa `<script>` vindo de campo livre | unit (função pura) | `npx vitest run src/features/privacidade/services/__tests__/exportacaoService.test.ts` | ❌ W0 |
| candidato | — | — | Bans de copy da UI-SPEC, **com o escopo de grep declarado por linha da tabela** | unit (sonda de texto-fonte) | idem | ❌ W0 |
| RH | — | — | `formatarBadgePendentes` importada, e o retorno **nunca** comparado com `''` (devolve `undefined`) | unit | `npx vitest run src/features/pedidos-dados/components/__tests__/` | ❌ W0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `docs/compliance/__tests__/exportAllowlist.test.ts` — EXPORT-02, EXPORT-04(1), EXPORT-06
- [ ] `docs/compliance/sql/05-export-allowlist-drift.sql` — EXPORT-04(2) **e a prova de mordida**
- [ ] `supabase/functions/exportar-meus-dados/__tests__/index.test.ts` — EXPORT-02 (Deno)
- [ ] **+1 linha literal no `exclude` do `vite.config.ts`** — no **mesmo commit** que o teste da EF
- [ ] `src/features/privacidade/components/__tests__/PedirCopiaBloco.test.tsx` — EXPORT-01
- [ ] `src/features/privacidade/components/__tests__/CurriculosBloco.test.tsx` — EXPORT-03
- [ ] `src/features/privacidade/services/__tests__/exportacaoService.test.ts` — geradores puros, escape, bans
- [ ] `src/features/pedidos-dados/constants/__tests__/slaDados.test.ts` — identidade de referência
- [ ] `src/features/pedidos-dados/components/__tests__/FilaPedidosDadosTable.test.tsx` — EXPORT-05
- [ ] Framework install: **nenhum** — Vitest 4 e Deno já estão vivos
- [ ] `js-yaml` promovido a **devDependency explícita** (hoje é dependência-fantasma via hoisting)

### Nota sobre a estreia do snapshot

A técnica **estreia neste repositório** — zero ocorrências de `toMatchSnapshot`/`toMatchInlineSnapshot`
hoje. A Wave 0 gera o snapshot com `-u` **uma vez**, um humano **lê o conteúdo gerado**, e só então
ele é commitado. *Um snapshot aceito sem leitura é um contrato que ninguém assinou.*

E porque `-u` descuidado é o modo de falha óbvio da técnica, o snapshot **não é a única rede**: a
asserção negativa nomeada (segredos e `ai_call_logs` ausentes) sobrevive a um `-u`, porque não é um
snapshot.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| O CV do titular abre de verdade pelo painel | EXPORT-03 | Storage real + sessão real de candidato; `createSignedUrl` contra bucket privado não é mockável de forma honesta | Login como candidato com CV, `/candidato/privacidade`, clicar "Abrir" na linha da candidatura, confirmar que o PDF abre e que o link expira em 60 s |
| O smoke SQL **morde** | EXPORT-04 | A prova exige alterar a fonte e observar a falha — é um experimento, não uma asserção | Remover uma linha do `VALUES` do smoke, executar, colar o par antes/depois no `44-VERIFICATION.md` |
| M3 — policies vivas das 2 tabelas novas | EXPORT-05 | Só mensurável **após** o apply da migration | `SELECT ... FROM pg_policies WHERE tablename IN ('solicitacoes_dados','config_sla_dados')` via MCP, pelo orquestrador |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 70s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
