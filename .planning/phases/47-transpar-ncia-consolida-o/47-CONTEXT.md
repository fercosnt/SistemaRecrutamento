# Phase 47: Transparência & Consolidação - Context

**Gathered:** 2026-08-08
**Status:** Ready for planning
**Mode:** Smart discuss (autônomo) — 16 decisões em 4 áreas, todas as recomendações aceitas pelo operador

<domain>
## Phase Boundary

O que o sistema faz com o dado passa a estar escrito onde o candidato lê, e nenhuma promessa de
compliance sobrevive neste repositório sem código que a execute.

**Entra na fase:** duas páginas públicas net-new (`/privacidade` e `/subprocessadores`), a correção
do Histórico do candidato para mostrar o nome do recrutador em vez do UUID do `ator`, a resolução
do zumbi `data_deletion_log`, o checklist versionado de promessas de retenção/exclusão, e os
vereditos Nyquist das 6 fases do M7 que fecharam sem `VALIDATION.md` real.

**NÃO entra na fase:** qualquer coisa que dependa da Phase 46 (a purga automática). O ROADMAP
declara esta fase dependente da Phase 43 — **não** da 45 nem da 46 — e *laterally parallelizable*
com a Phase 46. Ela lê melhor depois da 45, mas não a bloqueia nem é bloqueada por ela.

⚠ **Portão destrutivo aplica-se a UM item só: CONSOL-03.** `DROP` de `data_deletion_log` é
destrutivo sobre um objeto com **escritor vivo** (a RPC de rollback da prompt-library,
`20260609000002_prompt_library_rpcs.sql:227`). Dropar sem religar esse escritor quebra a
prompt-library **em silêncio**. Todo o resto da fase é aditivo.

</domain>

<decisions>
## Implementation Decisions

### Área 1 — As duas páginas públicas (TRANSP-01, TRANSP-02)

- **Duas rotas separadas, não uma página com seções.** `/privacidade` responde *o que é guardado,
  por quanto tempo e por quê*; `/subprocessadores` responde *com quem os dados são compartilhados*
  (Art. 18, VII). O ROADMAP declara "2 páginas públicas net-new" e a separação é a que o candidato
  consegue linkar isoladamente.
- **A tabela de retenção é DERIVADA por gerador em build-time**, num `.generated.ts`, espelhando
  exatamente o padrão já provado pelo 45-02 (`docs/compliance/sql/gen-recibo-exclusao.cjs` +
  o script `check:recibo-exclusao` no pre-commit). Um teste reprova quando a matriz muda sem
  regenerar. **Rejeitado:** ler `listar_matriz_retencao` em runtime — exigiria expor a RPC a `anon`
  e ampliaria a superfície pública sem necessidade. O SC#1 exige "derivada da matriz de retenção
  como **dado**, não redigida à mão", e o gerador é a forma que já provou fechar essa exigência
  nesta fase-irmã.
- **Cada subprocessador declara nome + finalidade + país + base legal.** O país entra porque
  transferência internacional é fato relevante sob a LGPD, não enfeite. Os quatro nomeados pelo
  ROADMAP são Resend, o provedor de LLM, Supabase e Vercel.
- **100% público: sem auth, indexável.** O critério de sucesso diz "qualquer visitante lê" — exigir
  login contradiria a própria transparência que a página existe para entregar.

### Área 2 — O nome do recrutador no Histórico (CONSOL-01 / VISRH-03)

- **O nome é resolvido no servidor**, na RPC/view que já serve o histórico
  (`historicoCandidaturaService.ts` / `HistoricoBlock.tsx`). Evita N+1 e evita expor a tabela de
  usuários RH ao candidato — o candidato recebe o nome já resolvido, nunca a capacidade de
  consultar quem existe.
- **Ator que é trigger automático renderiza o rótulo neutro "Sistema"** — nunca UUID, nunca vazio.
- **`ator` NULL renderiza "Recrutador removido"**, sem quebrar a tela. Este é o cruzamento explícito
  com a Phase 45: `historico_candidatura.ator` é uma das sete colunas que a severação do motor de
  exclusão zera. A tela tem de sobreviver a isso **por desenho**, não por acidente. **Rejeitado:**
  ocultar a linha — apagaria trilha de decisão, que é exatamente o que a RNF-07a protege.
- **Nome completo, não primeiro nome.** O Histórico é trilha de decisão sob a RNF-07a; abreviar
  reduz a rastreabilidade sem ganho.

### Área 3 — O zumbi `data_deletion_log` (CONSOL-03)

- **DROP, mas só depois de religar o escritor vivo.** É a recomendação registrada na própria
  pesquisa citada pelo ROADMAP: construir o tombstone novo e dropar o stub, **provado antes** que o
  escritor foi realocado.
- **O destino do escritor é MEDIDO no plano, não fixado agora.** A RPC de rollback da prompt-library
  (`20260609000002_prompt_library_rpcs.sql:227`) é o único escritor vivo conhecido; o plano mede o
  que ela realmente grava antes de escolher para onde ela passa a gravar.
- **Ordem obrigatória, em planos separados:** religar o escritor + provar por smoke → **só então**
  o `DROP`. A regra de wave do M8 proíbe misturar escrever uma migration com aplicá-la, e este é o
  único apply destrutivo da fase.
- **Saída de escape declarada:** se religar o escritor não for trivial, **adotar** a tabela
  (mantê-la com escritas reais e o `COMMENT` corrigido) em vez de dropar. O critério de sucesso diz
  "removido **OU** adotado com escritas reais" — as duas saídas são honestas, e escolher a segunda
  diante de uma dificuldade real não é recuo, é a leitura correta do critério.

### Área 4 — Vereditos Nyquist do M7 (SC#4) e o checklist de promessas (CONSOL-02)

- **"Veredito real" significa auditar os artefatos existentes** de cada fase (PLAN, SUMMARY, testes,
  evidências) e emitir veredito com evidência citada. **Não** significa re-executar as seis fases do
  M7 — isso custaria um milestone inteiro e não é o que o critério pede.
- **Um plano só, produzindo os 6 arquivos**, via `gsd-nyquist-auditor`. As fases são 36, 37, 38, 39,
  40 e 41 (36/38/39/41 estão em `draft`; 37 e 40 não têm arquivo).
- **Veredito negativo é aceitável e é o ponto.** Um `VALIDATION.md` que diz "cobertura insuficiente,
  eis o gap nomeado" é um veredito real. Forçar verde seria fabricar evidência — a mesma classe de
  erro que a Phase 43 recusou ao converter um item inobservável em `accepted_permanently` em vez de
  encurtar a janela só para o teste passar.
- **O checklist do CONSOL-02 é um TESTE VERSIONADO**, não um documento. Ele varre `COMMENT`s de
  migration e documentos atrás de promessas de retenção/exclusão e exige código vivo que as execute.
  É a mesma classe do `src/__tests__/copyPortoesLgpd.test.ts` que já existe e que já provou seu valor
  nesta fase-irmã (ficou vermelho por desenho até o motor existir, e fechou sozinho no 45-10).

### Claude's Discretion

- A copy exata das duas páginas públicas, dentro do registro pt-BR já estabelecido e da linguagem de
  produto obrigatória ("avaliação comportamental/cognitiva", nunca "teste psicológico").
- A estrutura de arquivos dentro de `src/features/`, seguindo a convenção do projeto.
- O ponto de navegação exato das duas páginas (rodapé é o candidato natural, dado que `/manifesto`
  já estabelece o padrão de rota pública).
- A forma concreta do gerador da matriz de retenção, desde que espelhe o contrato do 45-02: falha
  ALTO quando fonte e artefato divergem.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets

- **`docs/compliance/sql/gen-recibo-exclusao.cjs` + `npm run check:recibo-exclusao`** (45-02) — o
  padrão de artefato gerado que falha alto. É o molde declarado da derivação da matriz de retenção.
- **`src/__tests__/copyPortoesLgpd.test.ts`** (Phase 43) — o molde do checklist versionado do
  CONSOL-02: um teste que varre superfícies atrás de promessas órfãs.
- **`supabase/migrations/20260801000002_p43_config_retencao.sql`** + `listar_matriz_retencao` +
  `src/features/admin/retencao/services/retencaoService.ts` — a matriz de retenção como dado, que a
  página pública deriva.
- **`/manifesto`** em `src/router/routes.tsx:147` — precedente vivo de rota 100% pública sem auth.
- **`src/features/hub-candidato/components/HistoricoBlock.tsx`** e
  `src/features/hub-candidato/services/historicoCandidaturaService.ts` — a superfície que o
  CONSOL-01 corrige.

### Established Patterns

- Artefato gerado + script `check:` no pre-commit, com o gerador reprovando nas duas direções.
- RPC `SECURITY DEFINER` com guard no corpo (`IS DISTINCT FROM`, nunca `NOT IN` — o `NOT IN` falha
  ABERTO com role NULL, defeito real medido na 42-06).
- Migrations sem wrapper `BEGIN;/COMMIT;` externo, com o comando de reconcile do ledger no cabeçalho
  (CLAUDE.md § workaround PL/pgSQL — o driver do CLI já envolve cada migration na própria transação).
- Baseline `tsc` congelada em **97** desde a Phase 42, como gate de não-regressão. Zero `--no-verify`.

### Integration Points

- `src/router/routes.tsx` — as duas rotas públicas novas.
- O rodapé / navegação pública — onde as duas páginas ficam alcançáveis.
- `historicoCandidaturaService.ts` + a RPC/view do histórico — onde o nome do recrutador é resolvido.
- `supabase/migrations/20260609000002_prompt_library_rpcs.sql:227` — o escritor vivo que o CONSOL-03
  tem de religar antes de qualquer `DROP`.

</code_context>

<specifics>
## Specific Ideas

- Os quatro subprocessadores a nomear são **Resend, o provedor de LLM, Supabase e Vercel** — vindos
  literalmente do critério de sucesso #1 do ROADMAP.
- As seis fases do M7 sem veredito são **36, 37, 38, 39, 40 e 41**.
- O `data_deletion_log` existe desde **2026-06-09**, tem **0 linhas**, promete no `COMMENT` uma
  `delete_candidate_data()` **ausente de `pg_proc`** que a Phase 15 nunca criou, e foi repropositado
  pelo rollback da prompt-library. Essa história inteira precisa aparecer no registro da decisão,
  seja ela `DROP` ou adoção.

</specifics>

<deferred>
## Deferred Ideas

- **`DI-45-05-01`** — a tela de auditoria de viés (`src/features/admin/bias-audit/`) ainda lê o
  payload v1 e renderiza `undefined` nas células suprimidas por k-anonimato, o que **parece um zero**.
  É defeito de UI de uma peça probatória e não pertence a esta fase, mas está vivo e sem dono.
- **`DI-45-08-01`** — o "X" do `DialogContent` vendorizado (`src/components/ui/dialog.tsx:72-75`) tem
  rótulo `sr-only` em inglês ("Close") numa superfície inteiramente pt-BR e não atinge o alvo tátil
  de 44px. Fecha num plano de UI transversal ou no `/gsd-ui-review`.
- **`DI-45-12-01`** — a asserção C1 do smoke da Phase 45 e a migration `20260805000003` afirmam
  coisas opostas sobre `EXECUTE` em `gerar_bias_snapshot` para `authenticated`. É decisão do portão
  do 45-11, não desta fase, mas fica registrada aqui porque o reflexo perigoso (revogar para "consertar"
  a asserção) apagaria a tela de auditoria de viés do administrador.

</deferred>
