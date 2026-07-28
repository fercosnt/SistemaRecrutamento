# Phase 36: Deliverability & Sender Identity - Context

**Gathered:** 2026-07-21
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 4 grey areas, 16 decisions, todas aceitas como recomendadas

<domain>
## Phase Boundary

Estabelecer a **identidade de remetente** e a **disciplina de segredo/destinatário** que todo o pipeline de e-mail do M7 vai herdar — antes de existir qualquer EF, tabela ou trigger.

**Dentro do escopo:**
- Verificação do domínio de envio no Resend (SPF/DKIM auto + DMARC manual) — ação humana/DNS do Fernando, documentada por runbook
- Definição canônica de From / Reply-To / display name
- `RESEND_API_KEY` provisionada **apenas** no Supabase Vault (nunca `VITE_`, nunca bundle)
- Grep-guard de bundle provando que nenhuma chave/URL do Resend vaza no build público
- Contrato de configuração compartilhado (`_shared/email-config.ts`) com guard de destinatário non-prod + testes Deno

**Fora do escopo (fases seguintes):**
- Tabela `notificacoes_enviadas` / `config_sla_etapa` → P37
- EF `notificar-candidato`, templates HTML, `.ics` → P38
- Triggers, DROP dos triggers n8n → P39
- Webhook Resend / `pg_cron` retry → P41

Fase é **lateralmente paralelizável**: não bloqueia nem é bloqueada pelas P37–P40; só precisa aterrissar antes do primeiro envio a candidato real (UAT da P41).

</domain>

<decisions>
## Implementation Decisions

### Identidade de Remetente (DELIV-01)
- **Domínio de envio:** `recruta.beautysmile.com.br` — subdomínio já usado pelo produto (`CriarEditarVagaPage.tsx:565` mostra `recruta.beautysmile.com.br/vagas/{slug}`). O Resend cria os records em `send.recruta.…` (MX + TXT SPF) e `resend._domainkey.recruta.…` (CNAME), então **não colide** com o A record do site. Isola reputação de envio do root corporativo.
- **From:** `Beauty Smile Recrutamento <nao-responda@recruta.beautysmile.com.br>` — display name reconhecível, local-part em pt-BR (convenção do domínio) e explicitamente transacional.
- **Reply-To:** `recrutamento@beautysmile.com.br` — caixa real do RH no domínio **root** (separa envio de recepção). Candidato que responde não cai no vazio.
- **DMARC inicial:** `v=DMARC1; p=none; rua=mailto:dmarc@beautysmile.com.br` publicado em `_dmarc.recruta.beautysmile.com.br`. Monitorar primeiro; endurecer para `quarantine`/`reject` depois de ter dados de alinhamento (não neste milestone).

### Gestão do Segredo & Guard de Bundle (DELIV-02)
- **Local do segredo em PROD:** Supabase **Vault** (`vault.create_secret` → lido via `vault.decrypted_secrets` dentro da EF). Espelha o padrão já estabelecido no repo (`edge_invoke_key`, `project_url`, SEC-03). **Nunca** `supabase secrets set` como fonte de verdade em PROD, nunca env `VITE_`.
- **Duas chaves, não uma:** chave *test-mode* para local/`supabase functions serve` (`.env` gitignored) + chave *prod* somente no Vault. Revogar a de dev não derruba PROD.
- **Grep-guard:** novo `scripts/assert-no-secrets.mjs` — irmão de `scripts/assert-chunks.mjs`, mesmo estilo (leitura pura de `build/assets/*`, sem rede, sem eval). Varre por `re_[A-Za-z0-9]{8,}`, `api.resend.com`, `RESEND_API_KEY`; sai não-zero no primeiro hit. **Não** estender `assert-chunks.mjs` (mistura perf com segredo).
- **Enforcement duplo:** encadeado no `postbuild` do `package.json` (falha o `npm run build` local) **e** como step no job `build` do `.github/workflows/ci.yml`, logo após "Bundle gate (PERF-03)". Falha dura nos dois.

### Disciplina Test-Address Dev/CI (DELIV-03)
- **Artefato de código da P36:** `supabase/functions/_shared/email-config.ts` — constantes From/Reply-To, resolução de modo, e `resolverDestinatario()`; com suite Deno em `supabase/functions/_shared/__tests__/`. A P38 **importa** esse contrato em vez de reinventá-lo. (Sem isso DELIV-03 seria não-verificável nesta fase.)
- **Chave de modo:** env explícito `NOTIFICACOES_MODO ∈ {producao, teste}`, com **default `teste`** — fail-safe: sem configuração deliberada, nenhum e-mail sai para pessoa real. Não inferir de hostname/`SUPABASE_URL`.
- **Comportamento em modo teste:** reescreve o destinatário para `delivered+<evento>@resend.dev` e **preserva o endereço original** em campo separado (para auditoria/ledger na P37+). Exercita o caminho feliz inteiro sem tocar inbox real. Não usar `candidatura_id` no `+label` (PII-ish num endereço de terceiro).
- **CI sem chave viva:** CI roda **sem** `RESEND_API_KEY`; o sender é injetado por mock nos testes Deno. `email-config` lança erro explícito se `modo=producao` sem chave presente. Nada de chave test-mode real nos GitHub Secrets.

### Encerramento do Gate Humano & Provisionamento
- **Fase não bloqueia no DNS:** DELIV-01 entra em VERIFICATION como **HUMAN-UAT pendente** (padrão do repo, P22–P35), com runbook passo-a-passo + checklist. A fase completa; a cadeia 37→38→39 não espera propagação DNS.
- **Verificação opt-in:** `scripts/check-resend-dominio.mjs` chama `GET https://api.resend.com/domains` e reporta status + records faltantes. **Nunca no CI**; no-op com aviso claro se não houver chave disponível.
- **Vault só com chave real:** Fernando gera a chave prod no Resend → `vault.create_secret` executado via Supabase MCP assim que ela existir. **Sem placeholder** (uma EF com chave falsa falha opacamente em 401 em vez de dizer "não configurado"). Se a chave não existir durante a P36, o runbook grava o comando exato e a P38 (smoke) cobra.
- **Docs em `docs/runbooks/`:** novo diretório, arquivo `resend-dominio-envio.md`. `docs/` raiz já tem ~40 arquivos soltos; runbooks operacionais ganham lar próprio (e não somem no cleanup do milestone, ao contrário de `.planning/phases/…`).

### Correções e Decisões Pós-Research (2026-07-22)

> A pesquisa da fase (`36-RESEARCH.md`) invalidou três premissas do discuss e levantou duas escolhas de operação. Estas entradas **prevalecem** sobre o texto acima onde houver conflito.

- **CORREÇÃO — não existe job `build` no CI.** Os jobs reais de `.github/workflows/ci.yml` são `unit`, `deno-test`, `e2e` e `lighthouse`; o step "Bundle gate (PERF-03)" vive dentro do job **`e2e`** (`ci.yml:111`). O novo guard entra encadeado no `postbuild` do `package.json` — o que já dá enforcement de graça nos **dois** jobs que rodam `npm run build` (`e2e` e `lighthouse`) — mais um step explícito no job `e2e` logo após o bundle gate.
- **CORREÇÃO — regexes do guard.** `re_[A-Za-z0-9]{8,}` sem `\b` casa dentro de identificadores minificados (ex.: `meas`+`ure_som`+`ething`) e deixaria o guard vermelho no primeiro build. Usar limite de palavra. E **`recruta.beautysmile.com.br` NÃO pode ser padrão do guard** — já está legitimamente no bundle (`src/components/pages/CriarEditarVagaPage.tsx:565`). O guard mira chave (`\bre_…`), `api.resend.com` e `RESEND_API_KEY`; nunca o domínio.
- **CORREÇÃO — escopo do guard.** Varrer todo o `build/` (inclui `index.html`), não só `build/assets/*`.
- **NOVO — RPC leitora do Vault, na P36.** O schema `vault` não é exposto ao PostgREST, então uma EF não lê `vault.decrypted_secrets` diretamente. A P36 entrega uma RPC `SECURITY DEFINER` em `public`, **sem argumento** (`ler_resend_api_key()`, blast radius de um segredo e não de todos), `REVOKE` de `public`/`anon`/`authenticated` e `GRANT EXECUTE` só a `service_role`. Sem ela, o DELIV-02 seria um cofre que ninguém abre. Migration aplicada via Supabase MCP `apply_migration` + reconcile do ledger (padrão M2–M6; **não** `db push --linked`).
- **NOVO — nome do segredo:** `resend_api_key` (snake_case, convenção dos secrets existentes do repo).
- **DECISÃO DO USUÁRIO — chave dedicada.** O `cost-alerter` (`supabase/functions/cost-alerter/index.ts:208`) já consome `RESEND_API_KEY` como env secret da EF e envia de `alertas@beautysmile.app`. A P36 **gera uma segunda chave Resend, dedicada a notificações**, guardada só no Vault. O `cost-alerter` fica intocado. A divergência (uma chave Resend ainda em env secret) e o bug latente de entregabilidade do TLD `.app` são **registrados como débito**, não corrigidos aqui. Consequência de escopo: DELIV-02 lê-se como "a chave **de notificações** vive apenas no Vault".
- **DECISÃO DO USUÁRIO — região `sa-east-1` (São Paulo).** Define o MX de `send.recruta.beautysmile.com.br`. Candidatos e RH são todos no Brasil; processamento em território nacional é a melhor postura sob LGPD. Trocar depois exige re-verificar o domínio — o runbook deve dizer isso em destaque.
- **CORREÇÃO — colisão Vitest/Deno.** `vite.config.ts:13` coleta `**/__tests__/**/*.test.ts`; o novo `_shared/__tests__/email-config.test.ts` usa specifiers Deno e quebraria `npm run test:run`. A entrada em `test.exclude` de `vite.config.ts` deve ser criada **na mesma tarefa** que cria o teste (o arquivo documenta que esse erro já aconteceu duas vezes — `vite.config.ts:38-43`).
- **NOTA — DKIM não hardcodável.** A doc de API do Resend mostra CNAME token-prefixado da SES; a doc de dashboard descreve TXT com chave pública. Dois shapes em circulação → o runbook copia os valores que o dashboard exibir, sem transcrever um shape fixo.

### Claude's Discretion
- Formato exato dos regexes do grep-guard e da mensagem de erro (desde que use limite de palavra, falhe duro e aponte o arquivo/offset ofensor).
- Assinatura precisa de `resolverDestinatario()` e shape do retorno (desde que preserve o destinatário original e o evento).
- Estrutura interna do runbook (desde que provider-agnóstica no DNS e com os valores canônicos acima literais e copiáveis).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/assert-chunks.mjs` — modelo direto para `assert-no-secrets.mjs`: leitura pura de `build/assets/*.js`, sem rede/eval, docblock explicando o gate, `process.exit(1)` no fail. Rodado por `postbuild` e pelo job `build` do CI ("Bundle gate (PERF-03)", `ci.yml:111`).
- `supabase/functions/_shared/` — 20+ módulos compartilhados com convenção estabelecida (`constants.ts`, `*-schemas.ts`, `__tests__/`). `email-config.ts` entra aqui naturalmente.
- Padrão Vault já provado no repo: `edge_invoke_key`, `project_url`, e o (aposentado) `n8n_webhook_base` do SEC-03.
- `docs/email-templates/` — templates HTML de auth (GoTrue) já existentes; **não** confundir com os templates transacionais do M7 (P38). Referência de tom/marca, não de código.

### Established Patterns
- Deno EFs testadas via `deno test --allow-env --allow-read --config supabase/functions/deno.json supabase/functions` (`ci.yml:87`), **sem `--allow-net`** — mocks injetados. Isso já *força* a arquitetura de sender injetável do DELIV-03.
- CI define env com fallback placeholder (`ci.yml:48-49`) — mesma disciplina para o modo de notificação.
- Migrations PROD via Supabase MCP `apply_migration`/`execute_sql` + reconcile do ledger (não `db push --linked`, por causa do 42601 em corpos `$$`).

### Integration Points
- `package.json` `postbuild` (linha 98) — encadear o novo guard.
- `.github/workflows/ci.yml` job `build` — novo step após "Bundle gate (PERF-03)".
- `supabase/functions/_shared/email-config.ts` — consumido pela EF `notificar-candidato` na P38 (From/Reply-To/guard) e pelo ledger da P37 (campo do destinatário original).
- Vault (`vault.decrypted_secrets`) — a EF da P38 lê `RESEND_API_KEY` daqui.

</code_context>

<specifics>
## Specific Ideas

- Valores canônicos que devem aparecer **literais** no runbook e nas constantes:
  - Domínio de envio: `recruta.beautysmile.com.br`
  - From: `Beauty Smile Recrutamento <nao-responda@recruta.beautysmile.com.br>`
  - Reply-To: `recrutamento@beautysmile.com.br`
  - DMARC: `_dmarc.recruta.beautysmile.com.br` → `v=DMARC1; p=none; rua=mailto:dmarc@beautysmile.com.br`
  - Endereços de teste: `delivered@resend.dev`, `bounced@resend.dev`, `complained@resend.dev` (com `+label`)
- Research relevante já feita: `.planning/research/STACK.md` L173-186 (setup de domínio), L46-48 (endereços de teste), L206-213 (armadilhas: `VITE_`, `onboarding@resend.dev` como From de prod, import dinâmico `npm:`).
- Fail-safe é a espinha dorsal desta fase: default `teste`, sem placeholder no Vault, falha dura no guard. Toda ambiguidade resolve para "não envia".

</specifics>

<deferred>
## Deferred Ideas

- **Endurecer DMARC** para `p=quarantine`/`p=reject` — depois de acumular relatórios `rua`; fora do M7.
- **Warm-up de reputação / IP dedicado** — volume do ATS não justifica; não pesquisar neste milestone.
- **Monitoramento de reputação** (taxa de bounce/complaint em dashboard) — a P41 traz o webhook e o ledger de status; dashboard de reputação fica para M8+.
- **Registro de domínio adicional para links/tracking** — não há tracking de clique no v1 (transacional sem opt-out, footer informativo).

## Item aberto (registrado, não bloqueante)

- **Onde o DNS de `beautysmile.com.br` é hospedado** (Registro.br / Cloudflare / outro) — o runbook sai provider-agnóstico; Fernando preenche na execução do gate humano.

</deferred>
