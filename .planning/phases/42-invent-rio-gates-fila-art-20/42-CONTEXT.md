# Phase 42: Inventário, Gates & Fila Art. 20 - Context

**Gathered:** 2026-07-29
**Status:** Ready for planning
**Mode:** Smart discuss (autonomous) — 4 grey areas, 20 decisões, todas aceitas como recomendadas

<domain>
## Phase Boundary

Duas entregas que não se sobrepõem, unidas por serem **ambas pré-condição do resto do milestone**:

1. **A fila Art. 20 (REVISAO-01..06)** — hoje um pedido de revisão do candidato grava um
   timestamp (`decisao_final.revisao_solicitada_em`) que ninguém lê. Esta fase fecha o
   round-trip: o pedido chega ao RH (e-mail + fila ordenada com badge de SLA interno), o RH
   responde por write-path auditável único, quem decidiu é barrado **pelo servidor** de
   responder à revisão da própria decisão, e o candidato é notificado (5º evento do pipeline
   COMM já provado no M7).

2. **O inventário (INVENT-01..05)** — o mapa datado do que existe, **antes** de qualquer linha
   destrutiva do milestone: PII coluna-a-coluna classificada (apagar / anonimizar / preservar),
   status de PITR com o registro explícito de que Storage não tem backup, diff dos `cron.job`
   vivos contra o repositório, varredura do idioma `ADD COLUMN IF NOT EXISTS`, e a correção do
   único bug destrutivo latente (`ai-logs-retention-cleanup`).

**Fora do escopo desta fase:** qualquer exclusão, anonimização, purga, política de retenção ou
consentimento. A fase é read-only exceto por INVENT-05.

</domain>

<decisions>
## Implementation Decisions

### Fila de Revisão RH (REVISAO-02)
- **Rota nova `/rh/revisoes`**, superfície RH net-new desktop-first, com entrada no menu RH e
  contador de pendentes. Não é seção do `DashboardRHPage` nem aba do `CandidatosRHPage`.
- **O limiar do badge de SLA vive em tabela de configuração**, reusando o padrão já provado
  `config_sla_etapa` (P37) — alterável sem deploy. BD-4 (o número) segue em aberto: entra como
  **seed**, nunca como constante compilada.
- **Badge de 3 faixas (verde / âmbar / vermelho)** com rótulo em dias de espera. O SLA é
  **interno e nunca exibido ao candidato**, e a copy interna nunca usa "prazo legal" — o Art. 20
  não tem prazo estatutário, e nomeá-lo assim é o erro que a pesquisa isolou (Pitfall 8).
- **Ordenação mais antigo primeiro; só pendentes por padrão**, com toggle "incluir respondidos"
  para o histórico não sumir.
- **Cada linha mostra:** candidato · vaga · decisão original · quem decidiu · dias em espera · badge.

### Write-path da resposta + guard reviewer ≠ decider (REVISAO-03/05)
- **RPC `SECURITY DEFINER` único `responder_revisao_decisao`** — é a convenção viva do projeto
  (`solicitar_revisao_decisao`, `salvar_revisao_redacao`, `confirmar_revisao_entrevista`) e o
  único caminho em que o guard é de fato server-enforced.
- **Colunas novas:** `revisao_por_usuario uuid REFERENCES auth.users(id)` e
  `revisao_respondida_em timestamptz`. A migration **não usa `ADD COLUMN IF NOT EXISTS`** — é
  exatamente o idioma que INVENT-04 identifica como o que silencia cláusulas FK (causa
  identificada do drift `candidatos.user_id`). Autoconsistência: a fase que documenta o defeito
  não pode reproduzi-lo.
- **Resultado estruturado:** veredito (`mantida` / `revertida`) em coluna própria +
  justificativa ≥50 caracteres em `revisao_resultado`, espelhando o guardrail já vivo em
  `decisao_final.justificativa`.
- **Guard absoluto:** `auth.uid()` ≠ `decisao_final.por_usuario`, sem exceção. Quando o único RH
  disponível for o decisor, o servidor barra e a mensagem instrui a escalar a outro RH/admin.
  Nenhuma sobreposição por admin, nenhum fallback "se só houver 1 RH ativo" — uma exceção
  server-side é o buraco que anula o requisito.
- **Prova do bloqueio:** tentativa real com JWT impersonado de dois usuários RH distintos, com o
  output registrado no VERIFICATION.md. O critério de sucesso #3 exige explicitamente que não
  seja aviso de UI nem teste com mock.

### Notificações — RH (REVISAO-01) e candidato (REVISAO-04)
- **EF nova `notificar-rh`**, irmã e separada de `notificar-candidato`. A resolução de
  destinatário é distinta da candidate-hard-wired; não estender a EF viva para isso.
- **Destinatários:** todos os `usuarios_rh` ativos com role `rh`/`administrador`, resolvidos por
  query no momento do envio (não lista fixa em env/Vault).
- **Disparo:** trigger na transição `revisao_solicitada_em` NULL→NOT NULL + `pg_net`, espelhando
  o padrão já vivo (P39 rewire / P41 retry).
- **5º evento do pipeline COMM: `revisao_respondida`.** Diff mínimo, adicionado nos **dois**
  lugares que fecham o vocabulário — a union `EVENTOS_VALIDOS` em
  `supabase/functions/notificar-candidato/index.ts` **e** o CHECK constraint vivo no banco — na
  mesma migration/deploy. Exigida asserção de que os 4 eventos existentes (`confirmacao`,
  `avanco`, `convite`, `decisao`) continuam ramificando corretamente, **incluindo o preheader**:
  o defeito W-01 era invisível a asserções que olham só o texto visível.
- **O e-mail ao RH entra no mesmo ledger `notificacoes_enviadas`**, com dedupe key própria e o
  mesmo respeito a `NOTIFICACOES_MODO` — senão o envio ao RH vira o único caminho do sistema sem
  trilha e sem modo teste.

### Artefatos de inventário (INVENT-01..05, REVISAO-06)
- **Os artefatos vivem em `docs/compliance/` (pasta nova) no repositório.** O critério de
  sucesso #4 diz "no repositório", e as Phases 44/45 vão consumi-los muito depois de
  `.planning/phases/42-…` virar arquivo morto.
- **Inventário PII em formato duplo:** YAML/JSON machine-readable como fonte de verdade +
  tabela Markdown gerada dele. A Phase 44 (allowlist do export) e a 45 (plano de exclusão)
  consomem o **dado**, não a prosa; e EXPORT-04 (snapshot test) precisa de algo diffável.
- **Semente obrigatória: `.planning/research/FK-AUDIT-LIVE.md`** — o grafo de FK vivo, nunca
  arquivos de migration (o repositório está comprovadamente em drift com PROD).
- **REVISAO-06 é entregue antes de qualquer tela:** SQL versionado em `docs/compliance/` + o
  resultado datado colado no artefato. A ordem é exigência explícita do critério de sucesso #4.
- **INVENT-02 (PITR):** verificado via API/MCP do Supabase e registrado como fato datado, com a
  frase explícita de que **Storage não é coberto por nenhum caminho de backup** — verdade
  independente do PITR estar ligado ou não.
- **INVENT-05 (o único write destrutivo da fase):** `NOT IN` → `NOT EXISTS` no
  `ai-logs-retention-cleanup`, sob o portão de fase destrutiva do milestone — contagem
  antes/depois pela **mesma query**, dry-run, review bloqueante, zero `--no-verify`. Blast
  radius hoje é 0 linhas (`ai_call_logs` vazio): registrar isso como fato datado **antes** do
  apply, porque o efeito da correção é fazer um `DELETE` vivo passar a apagar de verdade.

### Claude's Discretion
- Nomes exatos de arquivos, componentes e migrations; layout fino da fila; estrutura interna dos
  artefatos YAML/Markdown; divisão em planos.
- Escolha entre enum Postgres e CHECK constraint para o veredito da revisão.
- Estratégia de teste além das provas exigidas nominalmente (JWT impersonado, não-regressão dos
  4 eventos, contagem antes/depois do INVENT-05).

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`decisao_final`** (`supabase/migrations/20260607000003_decisao_final.sql`) — já tem
  `por_usuario uuid NOT NULL REFERENCES auth.users(id)` (o decisor, guardrail LGPD-02),
  `revisao_solicitada_em timestamptz` e `revisao_resultado text` como colunas Art. 20
  forward-looking escritas pela Phase 15. RLS já separa leitura RH (`rh`/`administrador`) de
  leitura do próprio candidato.
- **`solicitar_revisao_decisao`** — RPC own-row viva em PROD
  (`20260625100001_decisao_final_phase15.sql`), consumida por
  `src/features/explicacao/services/explicacaoService.ts` e `SolicitarRevisaoCTA.tsx`. É o
  produtor do pedido que esta fase passa a consumir.
- **Pipeline COMM do M7** — `notificar-candidato` (EF viva, 4 eventos), ledger
  `notificacoes_enviadas`, `NOTIFICACOES_MODO`, dedupe key, claim-before-send, e o sweep de
  retry `varrer_retry_notificacoes` (P41).
- **`config_sla_etapa`** (`20260721000002_config_sla_etapa.sql`) — precedente de tabela de
  configuração alterável sem deploy, com trigger de updated_at e RLS de leitura pública.
- **Padrão de RPC de revisão** — `salvar_revisao_redacao` (triagem) e
  `confirmar_revisao_entrevista` (entrevista) são os dois análogos mais próximos do write-path
  auditável único a construir.
- **`.planning/research/FK-AUDIT-LIVE.md`** — grafo de FK vivo, semente do INVENT-01.

### Established Patterns
- Trigger no banco + `pg_net` para acionar Edge Function (`20260726000001_p39_rewire_triggers…`,
  `20260727000001_p41_recon_retry.sql`) — o caminho já provado em produção.
- RPC `SECURITY DEFINER` para todo write privilegiado; client nunca escreve direto (as políticas
  de INSERT em `decisao_final` são `WITH CHECK (false)`).
- Features em `src/features/<dominio>/` com `components/`, `services/`, `hooks/`, `schemas/`.
- Migrations PL/pgSQL com `$$` exigem o workaround do SQL Editor + `migration repair` (CLAUDE.md).

### Integration Points
- `src/router/routes.tsx` — rota nova `/rh/revisoes` e a entrada no menu RH.
- `supabase/functions/notificar-candidato/index.ts` — `EVENTOS_VALIDOS` (linha ~65) e
  `mapearEvento`/`renderarEmail` em `helpers.ts`; **o mesmo arquivo que embarcou os defeitos
  CRÍTICOS CR-01/CR-02 da P39** — tratar como mudança de alto risco.
- CHECK constraint vivo do vocabulário de evento no banco (segundo lugar a editar).
- `supabase/functions/` — diretório da EF nova `notificar-rh`.
- `docs/compliance/` — pasta nova para os artefatos de inventário.

</code_context>

<specifics>
## Specific Ideas

- **A ordem dentro da fase importa e é normativa:** REVISAO-06 (a consulta "quantos pedidos já
  estão pendentes em PROD hoje") é entregue **antes de qualquer tela**. É critério de sucesso,
  não preferência.
- **A fase não pode reproduzir o defeito que documenta:** a migration que adiciona
  `revisao_por_usuario` / `revisao_respondida_em` não usa `ADD COLUMN IF NOT EXISTS` — INVENT-04
  existe justamente para catalogar esse idioma como causa de FK silenciada.
- **Linguagem de produto:** o SLA é interno. Nunca aparece para o candidato, e nunca é chamado
  de "prazo legal" em lugar nenhum — o Art. 20 não tem prazo, e a expressão "revisão por pessoa
  natural" foi vetada da lei (BD-3 segue em aberto, mas a recomendação da pesquisa é manter o
  rótulo, já que a RNF-07a entrega a substância).
- **Portão destrutivo aplica-se só ao INVENT-05.** O resto da fase é read-only.
- **⚠ Conflito a resolver no plano — "zero `--no-verify`" vs. a baseline de 97 erros `tsc`.**
  O portão de fase destrutiva (STATE.md) exige **zero `--no-verify`** no commit do INVENT-05.
  Mas o hook `.husky/pre-commit` roda `npm run lint` (`tsc --noEmit`), que falha com **97 erros
  pré-existentes** em `src/**` (baseline documentada em `.planning/M7-HANDOFF.md:86`; teto de CI
  104; todos os commits P36–P41 usaram `--no-verify` com a contagem registrada). Como está, o
  commit do INVENT-05 **não pode** satisfazer o portão: `git commit` sem `--no-verify` é
  impossível enquanto a baseline existir. O plano precisa escolher **explicitamente** um
  caminho — as três saídas reais são: (a) converter o hook num **gate de não-regressão**
  (falha só se a contagem subir acima da baseline), que é a recomendação já registrada no
  M7-HANDOFF; (b) zerar os 97 erros, que é um trabalho de limpeza repo-wide em 33 arquivos e
  claramente fora do escopo desta fase; ou (c) reinterpretar o portão como "sem bypass
  silencioso" — `--no-verify` permitido desde que a contagem seja medida e registrada no
  VERIFICATION.md como asserção de não-regressão. **(a) é a saída recomendada** — resolve o
  portão de verdade para as Phases 45/46 (onde ele importa mais) e é barata.

</specifics>

<deferred>
## Deferred Ideas

- **BD-4 (o número do SLA da fila Art. 20)** — decisão de produto do operador. A fase entrega a
  estrutura (tabela de config) com um seed; o número definitivo não bloqueia.
- **BD-3 (manter ou reescrever o rótulo "revisão por pessoa natural")** — o roadmap situa em
  Phase 43. Não decidido aqui.
- **CONSENT-01/02** — a pesquisa sugeriu puxar os defaults de consentimento para a Phase 42; o
  ROADMAP do M8 decidiu deliberadamente manter CONSENT íntegro na Phase 43. Mantido lá.
- **Nome do recrutador em vez do UUID do `ator`** (W-1 / CONSOL-02) — mapeado à Phase 47.
  Se a fila da revisão precisar exibir "quem decidiu" por nome, resolver localmente sem
  antecipar o refactor do histórico.

</deferred>
