---
phase: 52-hub-do-rh-dados-e-contato
reviewed: 2026-10-11T06:23:28Z
depth: deep
diff_base: 0d70ac7d433db9a9a644987dcf442cc50022aaae
reviewed_head: 77d2ae2b42cc9c1a6bbe6eb97a3423ca4016293d
scope: review adversarial bloqueante nº 1 do portão do bloco B da Phase 52 (52-14, Task 2). Escopo — o diff de código inteiro `0d70ac7d..77d2ae2b -- . ':!.planning'` (112 arquivos, ~100 commits; blocos A e B, arnês p52_*, ferramentas do bloco C) e o `52-15-PLAN.md`, lido como o programa que escreve em PROD (ordem migration → EF → cliente, pin, ledger, enumerador, crawler). Os geradores do bloco C (`scripts/geradores/*`, `docs/specs/BANCO-SJT-V2.md`) e o `p52_banco_sjt_smoke.sql` foram lidos com profundidade menor — o 52-15 não os executa contra PROD e o bloco C tem portão próprio (52-REVIEW-BANCO); conferido que sobem no push como arquivos inertes e que o smoke recusa rodar fora do ensaio. Lidos como contexto, fora da lista revisada — CLAUDE.md, 52-CONTEXT (D-08..D-41), 52-14-PLAN, 52-02-SUMMARY, 51-REVIEW-PORTAO-3 (formato), os logs do tracer (`p52_14_evidencia/`), `useAutosaveAvaliacao.ts`, `scoresRhService.ts`, `candidaturasService.ts`, `p50_enumera.cjs`, e os corpos VIVOS (só leitura) de `is_active_rh_user`, `custom_access_token_hook` e `salvar_avaliacao_entrevista`. PROD só leitura (`set transaction read only`) ou no ensaio que aborta. Re-executados pelo revisor — `p52_ensaio.cjs --vistas supabase/tests/p52_leituras_rh_smoke.sql` (ENSAIO VERDE, prefixadas=[20261011000001,20261011000002], vistas=igual, 52l=20/20, 52l.pop=dev:3,sjt:6,tri:1); `p52_portao.cjs --auto-teste` (68 casos ok); o crawler do 52-15 contra PROD hoje (53 assets; `sair-da-prova`, `hub-abas` ausentes — o verify não passa vácuo antes do push). Medido em PROD (só leitura, só contagens/nomes de coluna) — ledger com cabeça 20261010000002 e nenhuma 20261011…; as duas linhas de `usuarios_rh` no estado do PRE da 0002 («RH3» recrutador / «RH2» administrador, ativos); todas as 44 colunas que a EF projeta existem; `enum_tag_opcao` contém `knockout`; `resposta_opcoes` é array de texto em 113/113; `devolutivas_candidato.candidatura_id` UNIQUE; `anon` sem privilégio em `candidatos`; 3 administradores e 2 recrutadores inativos; 9 das 27 perguntas SJT com `opcao_id` artesanal que codifica a `ordem`. Nada foi aplicado, publicado ou empurrado. O único commit é este arquivo.
files_reviewed: 113
files_reviewed_list:
  - docs/specs/BANCO-SJT-V2.md
  - efdeploy.cjs
  - scripts/geradores/gen-sjt-v2.py
  - scripts/geradores/sjt_texto.py
  - scripts/geradores/tabela-comprimento-sjt.py
  - scripts/geradores/test_gen_sjt_v2.py
  - scripts/p52_ensaio.cjs
  - scripts/p52_mutacoes.cjs
  - scripts/p52_portao.cjs
  - scripts/p52_tipografia.cjs
  - scripts/p52_vitest_delta.cjs
  - src/__tests__/guards/p52-ban-jargao-entrevista.grep.test.ts
  - src/__tests__/guards/p52-ban-modelo-modelo.grep.test.ts
  - src/__tests__/guards/p52-ban-percentil-bigfive-hub.grep.test.ts
  - src/__tests__/guards/p52-ban-tempo-sugerido.grep.test.ts
  - src/components/RHSidebar.tsx
  - src/components/__tests__/RHSidebar.activePage.test.tsx
  - src/components/layouts/CandidatoNavbar.tsx
  - src/components/layouts/__tests__/CandidatoNavbar.test.tsx
  - src/components/pages/DashboardCandidatoPage.tsx
  - src/components/pages/FormularioCandidaturaPage.tsx
  - src/components/pages/LoginCandidatoPage.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.concluidas.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.encerrada.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.funnel.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.navbar.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.reaberta.test.tsx
  - src/components/pages/__tests__/FormularioCandidaturaPage.agradecemos.test.tsx
  - src/components/pages/__tests__/LoginCandidatoPage.test.tsx
  - src/components/ui/__tests__/select.test.tsx
  - src/components/ui/select.tsx
  - src/features/agendamento/components/AgendamentoBlock.tsx
  - src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx
  - src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx
  - src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.shell.test.tsx
  - src/features/avaliacao-cognitiva/components/__tests__/navegacao-cognitiva.test.tsx
  - src/features/avaliacao/components/AvaliacaoContainer.tsx
  - src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx
  - src/features/avaliacao/components/BigFiveResultadoHub.tsx
  - src/features/avaliacao/components/DevolutivaBigFiveView.tsx
  - src/features/avaliacao/components/RedacaoEditorScreen.tsx
  - src/features/avaliacao/components/SairDaProvaButton.tsx
  - src/features/avaliacao/components/ScorecardAvaliacao.tsx
  - src/features/avaliacao/components/SjtCasoAbertoScreen.tsx
  - src/features/avaliacao/components/SjtMcDetalhe.tsx
  - src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx
  - src/features/avaliacao/components/TextoComCitacoes.tsx
  - src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx
  - src/features/avaliacao/components/__tests__/BigFiveResultadoHub.test.tsx
  - src/features/avaliacao/components/__tests__/SairDaProvaButton.test.tsx
  - src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx
  - src/features/avaliacao/components/__tests__/SjtMcDetalhe.test.tsx
  - src/features/avaliacao/components/__tests__/TextoComCitacoes.test.tsx
  - src/features/avaliacao/components/__tests__/navegacao-provas.test.tsx
  - src/features/avaliacao/hooks/useIdsAvaliacoesConcluidas.ts
  - src/features/avaliacao/lib/bigFiveRotulos.tsx
  - src/features/avaliacao/services/__tests__/avaliacoesRhService.test.ts
  - src/features/avaliacao/services/avaliacoesRhService.ts
  - src/features/decisao/components/RespostaCasoAbertoSjt.tsx
  - src/features/decisao/components/__tests__/RespostaCasoAbertoSjt.test.tsx
  - src/features/entrevista/components/EntrevistaScorecardInline.tsx
  - src/features/entrevista/components/__tests__/EntrevistaScorecardInline.test.tsx
  - src/features/entrevista/components/__tests__/GuiaEntrevistaPanel.test.tsx
  - src/features/entrevista/components/__tests__/TranscricaoReviewPanel.test.tsx
  - src/features/hub-candidato/components/AnaliseIABlock.tsx
  - src/features/hub-candidato/components/AvaliacoesRespondidasBloco.tsx
  - src/features/hub-candidato/components/ContatoCandidatoHeader.tsx
  - src/features/hub-candidato/components/DadosCadastroBloco.tsx
  - src/features/hub-candidato/components/HubCandidatoRH.tsx
  - src/features/hub-candidato/components/HubSection.tsx
  - src/features/hub-candidato/components/RespostasInscricaoBloco.tsx
  - src/features/hub-candidato/components/TextoComLinks.tsx
  - src/features/hub-candidato/components/__tests__/AnaliseIABlock.test.tsx
  - src/features/hub-candidato/components/__tests__/contatoCandidatoHeader.test.tsx
  - src/features/hub-candidato/components/__tests__/dadosCadastroBloco.test.tsx
  - src/features/hub-candidato/components/__tests__/hubAbas.test.tsx
  - src/features/hub-candidato/components/__tests__/hubAcoesEmTriagem.test.tsx
  - src/features/hub-candidato/components/__tests__/hubAcoesEncerrada.test.tsx
  - src/features/hub-candidato/components/__tests__/hubEmptyState.test.tsx
  - src/features/hub-candidato/components/__tests__/hubNotFound.test.tsx
  - src/features/hub-candidato/components/__tests__/hubVerRespostas.test.tsx
  - src/features/hub-candidato/components/__tests__/respostasInscricaoBloco.test.tsx
  - src/features/hub-candidato/hooks/useCadastroCandidatoRh.ts
  - src/features/hub-candidato/lib/__tests__/contato.test.ts
  - src/features/hub-candidato/lib/__tests__/formatos.test.ts
  - src/features/hub-candidato/lib/__tests__/linkify.test.ts
  - src/features/hub-candidato/lib/contato.ts
  - src/features/hub-candidato/lib/formatos.ts
  - src/features/hub-candidato/lib/linkify.ts
  - src/features/hub-candidato/services/__tests__/analiseCandidatoService.test.ts
  - src/features/hub-candidato/services/__tests__/cadastroCandidatoRhService.test.ts
  - src/features/hub-candidato/services/analiseCandidatoService.ts
  - src/features/hub-candidato/services/cadastroCandidatoRhService.ts
  - src/features/revisao/components/ContextoRejeicaoTriagemRevisao.tsx
  - src/features/revisao/components/ResponderRevisaoDialog.tsx
  - src/features/revisao/components/__tests__/ContextoRejeicaoTriagemRevisao.test.tsx
  - src/features/revisao/components/__tests__/ResponderRevisaoDialog.test.tsx
  - src/features/revisao/services/__tests__/revisaoService.test.ts
  - src/features/revisao/services/revisaoService.ts
  - src/features/triagem/components/ProvenienciaIABadge.tsx
  - src/features/triagem/components/RejeitarCandidaturaDialog.tsx
  - src/features/triagem/components/__tests__/ComparativoScreen.test.tsx
  - src/features/triagem/components/__tests__/ProvenienciaIABadge.test.tsx
  - src/features/triagem/components/__tests__/RedacaoReviewPanel.test.tsx
  - src/features/triagem/pdf/__tests__/exportComparativo.test.ts
  - src/features/vagas/lib/blocosFormulario.ts
  - supabase/functions/ler-cadastro-candidato-rh/index.test.ts
  - supabase/functions/ler-cadastro-candidato-rh/index.ts
  - supabase/migrations/20261011000001_p52_leituras_rh.sql
  - supabase/migrations/20261011000002_p52_nomes_rh_por_papel.sql
  - supabase/tests/p52_banco_sjt_smoke.sql
  - supabase/tests/p52_leituras_rh_smoke.sql
  - .planning/phases/52-hub-do-rh-dados-e-contato/52-15-PLAN.md
findings:
  critical: 1
  warning: 3
  info: 11
  total: 15
status: issues_found
---

# Phase 52: Code Review Report — portão nº 1 do bloco B (52-14, Task 2)

**Reviewed:** 2026-10-11T06:23:28Z
**Depth:** deep
**Files Reviewed:** 113 — os 112 arquivos de código do diff e o `52-15-PLAN.md`
**Status:** issues_found, com **1 crítico** — o portão NÃO abre com este review

## Summary

Parti da hipótese de que havia defeito, e procurei primeiro onde o dano seria maior: a EF que lê dado
pessoal com `service_role`, as três RPCs `SECURITY DEFINER`, a escrita de dado da 0002 e o programa do
52-15. **Nesse núcleo não achei crítico.** O crítico está na saída das provas do candidato (bloco A, 52-02),
que vai ao ar no mesmo push do 52-15.

O que conferi e está certo:

- **EF `ler-cadastro-candidato-rh`.** Autoriza pela linha VIVA de `usuarios_rh` (`ativo`, `deleted_at IS
  NULL`) ANTES de qualquer leitura privilegiada; o papel não vem do JWT. 401 sem sessão / `getUser` falho;
  403 para candidato, `gerente`, `visualizador`, inativo; 400 para corpo/uuid inválido (depois do 403 —
  não há oráculo de formato para não-RH); 404 idêntico para ausente, excluída e rascunho. Erro de banco
  vira 500 com código fixo de etapa, nunca a `message`. O log de sucesso leva só `candidatura_id`,
  `rh_user_id`, `role`. Projeção explícita em todas as seis leituras (nenhum `select('*')`); `id`/`user_id`
  do candidato servem só ao predicado do tombstone e não saem. Tombstone → `cadastro`, `contato` e
  `disponibilidade` nulos; `@invalido.local` (trim + caixa) → `contato: null` e `cadastro.email: null`,
  celular segue como texto (D-40). Várias linhas de `disponibilidade`: a de `updated_at` mais recente
  (coluna NOT NULL, então o `DESC NULLS FIRST` do Postgres não morde). A opção que elimina nunca é lida.
  CORS `*` sem cookie (bearer), preflight antes da guarda. `verify_jwt = true` pela tabela do `efdeploy`.
  `import.meta.main` é o padrão das 18 EFs vivas. Todas as 44 colunas projetadas existem em PROD (medido).
- **RPCs (0001).** Guarda `v_uid IS NULL OR coalesce(v_role,'') NOT IN (…)` e helper do ramo `rh` antes do
  primeiro `FROM public.` (o POS confere a posição no `prosrc` sem comentários). `REVOKE … FROM PUBLIC` E
  `FROM anon` nominal, `GRANT` a `authenticated`; o POS exige anon/PUBLIC sem EXECUTE. Candidatura viva
  nas três; mesmo `P0002` para ausente/excluída/rascunho/outra origem. Nenhum percentil (POS por `strpos`,
  L2 morde). SJT: allowlist `{opcao_id, texto, escolhida}`, ordem `md5(pergunta_id||opcao_id)`, etiqueta e
  peso só da resposta gravada, `perguntas` sem filtro de status, `.tag/.peso/.ordem` nunca lidos (POS +
  L3/L4 mordem). Triagem só `humana_triagem` (L5). `SECURITY DEFINER`, `STABLE`, `search_path = ''`.
- **Nomes por papel (0002).** PRE recusa se as duas linhas não estiverem exatamente no estado medido
  (1 linha, papel, nome literal «RH3»/«RH2» — conferido vivo agora); os literais novos são «Recrutador
  (teste)» e «Admin (teste)» (emenda da D-39), nunca lidos da outra linha, então a troca RH2↔RH3 é
  impossível; POS por impressão digital `to_jsonb` das demais linhas e das duas sem `nome_completo`/
  `updated_at`. Triggers vivos de `usuarios_rh` conferidos (o `anti_lockout` não age: papel e `ativo` não mudam).
- **Cliente, segurança.** Nenhum `dangerouslySetInnerHTML`/`innerHTML` em linha acrescentada; texto do
  candidato e citações por segmentos React; links só `http(s)` (`javascript:`/`data:` ficam texto),
  `target=_blank` + `noopener noreferrer`; `mailto:` só de endereço sem `?&#`/espaço/`@` extra, assunto por
  `encodeURIComponent`; `wa.me` só com 12–13 dígitos `55…` ou 10–11 sem DDD `0`; D-21/D-37 no tipo e na
  projeção (alternativa sem etiqueta/peso); D-27 sem escrita (as leituras do painel são as do container;
  `get_avaliacao_status` não tem INSERT/UPDATE); login anti-open-redirect pelo `resolveRedirect` e escopo
  `/candidato/`; notas 1–5 nascem vazias, nenhuma leitura da nota da IA para o estado; abas com
  `replace: true`; `SelectItem` herda a cor.
- **52-15.** Ordem migration → EF → cliente amarrada por máquina: `--modo apply` exige HEAD = pin; `deploy`
  e `push` exigem toda `_p52_` do pin no ledger com md5 = arquivo (8). O `--caminhos` do enumerador casa os
  112 arquivos do diff (medido: 0 fora); os 97 commits locais casam o `--assunto`. O crawler visita 53
  assets hoje e não acha os marcadores (não passa vácuo antes do push).

### Veredito sobre os itens levantados pelos executores

| # | Item | Veredito | Evidência |
|---|---|---|---|
| 1 | 52-24 trocou o caso «nenhum link na ficha» do 52-10 | **substituição, não enfraquecimento** | `git show 7745a2c2`: o caso antigo afirmava «LinkedIn https como texto» — contrato que a D-20 revogou. Os dois novos afirmam o link `https` com `target`/`rel`/`aria-label`, Instagram sem esquema como texto, exatamente 1 `<a>` na ficha, e `javascript:`/`data:` sem `href` e sem `<script>`. |
| 2 | 52-25 trocou o stub «Ver respostas» em `hubAbas.test.tsx` | **não enfraquece** | O stub era do componente que saiu do hub (D-52-U03). A presença do `ScorecardAvaliacao` aberto DENTRO da aba Avaliações passou a ser travada em `hubVerRespostas.test.tsx` (monta `?aba=avaliacoes`, caso «montado ABERTO dentro da seção»). |
| 3 | 52-25: vaga sem o instrumento + leitura falha → erro sem detalhe | **real, menor** | IN-05. |
| 4 | F13: «todas as competências» só no cliente | **confirmado** | `prosrc` vivo de `salvar_avaliacao_entrevista`: aceita qualquer objeto com ≥1 nota numérica 1–5; valores fora disso são ignorados em silêncio. IN-03. |
| 5 | 52-02: sair da Redação antes do reload grava `{}` | **confirmado; e o defeito maior está ao lado** | WR-01; e CR-01 (Big Five e Caso prático nunca releem o rascunho). |
| 6 | F4: RH já tem SELECT em `candidatos` | **confirmado e concreto** | Policy viva «RH pode ler todos os candidatos»; `candidaturasService.ts:54` (`CANDIDATO_ALLOWLIST = 'id, nome_completo, email, celular'`) já leva e-mail e celular à lista do RH sem log. IN-02. |
| 7 | T-52-33 / O5: `getScores` ainda manda `percentil` | **confirmado** | `scoresRhService.ts:80,133-134` (`metadata` inteiro na allowlist). IN-04. |

## Critical Issues

### CR-01: Big Five e Caso prático saem «direto, sem confirmação» porque «têm rascunho» — mas o rascunho deles nunca é relido; o candidato perde as respostas sem aviso

**File:** `src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx:351,370-377` · `src/features/avaliacao/components/SjtCasoAbertoScreen.tsx:128,243-248` · `src/features/avaliacao/components/SairDaProvaButton.tsx:79-104` · `src/features/avaliacao/hooks/useAutosaveAvaliacao.ts:123-129`

**Issue:** A regra da D-24/D-36 é «rascunho → sai direto; memória → confirma». O 52-02 classificou Big Five,
Redação e Caso prático como «com rascunho» porque as três usam `useAutosaveAvaliacao` (achado F1 da
pesquisa). Mas usar o hook só significa GRAVAR: o Big Five nasce com `useState<Record<string, number>>({})`
(:351) e o Caso prático com `useState('')` (:128), e nenhum dos dois lê de volta nem o `sessionStorage`
(`useAvaliacaoDraft.load()` não tem chamador em `src/features/avaliacao`) nem `respostas_avaliacao`
(`loadResposta` só tem chamador na Redação; no servidor só a exportação LGPD lê a tabela). Para o
candidato, as respostas dessas duas telas vivem só na memória, exatamente como no SJT MC, no Raven e na
prova cognitiva.

O próprio executor registrou o fato no `52-02-SUMMARY.md:212` («Big Five e Caso prático **não restauram** o
rascunho do banco … então o `{}` não muda nada que o candidato veja») e tirou a conclusão errada: ele olhou
só para o `{}` gravado, não para o que o candidato perde ao sair.

**Cenário em PROD (depois do push do 52-15):** a candidata responde 80 dos 116 itens do Big Five (ou escreve
15–20 min no Caso prático), toca «Voltar às avaliações» para reler as instruções — o botão navega sem
diálogo (`temRespostaNaoSalva={false}`, `SairDaProvaButton.tsx:79`). Ao reabrir a prova, o questionário
está vazio. A frase que a D-24 manda mostrar nesse caso («Se sair agora, as respostas desta prova não serão
salvas») seria, aqui, verdadeira, e é justamente a que não aparece. A fase existe para abrir o sistema a
candidatos reais; esse botão é novo nesta fase (na base, `backToList` só existia nos estados de erro e de
etapa avançada).

**Evidência medida:**
- `grep -rn "\.load()\|loadResposta" src | grep -v __tests__` → só `RedacaoEditorScreen.tsx:186` e o cadastro.
- `grep -n "setTexto\|setRespostas"` nas duas telas → só os `onChange`, nenhuma hidratação.
- `grep -rln respostas_avaliacao supabase/functions` → só `_shared/exportAllowlist.ts` e `_shared/reciboExclusao.ts`.

**Dono:** 52-02. O conserto toca uma premissa de decisão do operador (D-36: «Só Big Five, Redação e Caso aberto
saem direto»). A D-36 foi tomada sobre o fato «têm rascunho», que é falso para duas das três, e a regra que ela
mantém («memória → confirma») é a que resolve. Levar ao operador antes de consertar (memória «instrução para
campo inexistente vaza»).

**Fix:** o mais curto e fiel à regra da D-24: tratar as duas telas como «memória».
```tsx
// BigFiveQuestionnaireScreen.tsx
<SairDaProvaButton
  rotulo="voltarAvaliacoes"
  destino={`/candidato/avaliacao/${candidaturaId}`}
  temRespostaNaoSalva={answeredCount > 0}
/>
// SjtCasoAbertoScreen.tsx
<SairDaProvaButton … temRespostaNaoSalva={texto.trim() !== ''} />
```
A alternativa é implementar a releitura do rascunho nas duas telas, no molde da Redação, com o buffer
semeado. Ela é maior e precisa de teste de restauração. Em qualquer dos dois caminhos: um caso em
`navegacao-provas.test.tsx` que responde 1 item do Big Five, toca a saída e espera o diálogo. Depois, um
review NOVO `52-REVIEW-PORTAO-2`.

## Warnings

### WR-01: Redação — a saída grava `{}` por cima do rascunho salvo se o candidato sair antes de a releitura responder (item 5)

**File:** `src/features/avaliacao/components/RedacaoEditorScreen.tsx:180-201,359-366` · `src/features/avaliacao/hooks/useAutosaveAvaliacao.ts:88-93,123-129`

**Issue:** `flushNow` chama `flush` sempre, que faz `upsert({...bufferRef.current})`, mesmo sem nenhuma edição.
O buffer só é semeado quando `loadResposta` responde e o `pergunta_id` gravado é o da pergunta atual
(`:188`). O comentário de 2026-09-06 no próprio arquivo (`:193-195`) registra que isso já apagou uma redação
em PROD pelo «Enviar». O botão novo é o segundo chamador de `flushNow` com buffer potencialmente vazio.

**Cenário:**
- Celular lento: o candidato abre a Redação e toca «Voltar às avaliações» antes de a leitura voltar. O
  `{}` sobrescreve o rascunho. A releitura tardia rearma um timer de 30 s que regrava o texto, mas só se a
  aba continuar aberta. Fechou dentro de 30 s, o texto se perdeu.
- Rascunho de outra pergunta (vaga com 2+ prompts; `idx` sempre começa em 0): o buffer nunca é semeado, e
  a saída apaga o rascunho para sempre.

Não testado (o SUMMARY admite).

**Dono:** 52-02.

**Fix:** em `flushNow` (ou no `antesDeSair` das telas), não gravar com buffer vazio:
`if (Object.keys(bufferRef.current).length === 0) return`. Alternativa: só gravar com timer armado
(dirty). Acrescentar o teste «sair antes do `loadResposta` resolver não chama `upsertResposta` com `{}`».

### WR-02: o `capturar()` do ensaio não vê `usuarios_rh` — a escrita de dado da 0002 está fora da rede de «PERSISTIU»

**File:** `scripts/p52_ensaio.cjs:308-332` (consumido também por `scripts/p52_mutacoes.cjs:63-76`)

**Issue:** O cabeçalho promete que «qualquer diferença» do que nenhum ensaio pode mudar sai `PERSISTIU`. A
captura cobre:
- o ledger das versões p52;
- `revisao_rejeicao`;
- o fingerprint das funções p52;
- as funções de mutação;
- as fixtures `p51/p52 smoke`;
- `disp_anonimizados`.

Ela não cobre a única escrita de DADO do bloco B: `usuarios_rh.nome_completo` das duas contas (0002). O smoke
também escreve `usuarios_rh.ativo` (c/h/k/r) e `candidaturas` (h/t), e nada disso está na captura.

Hoje o aborto é garantido pelas guardas estruturais (txid em cada `ponto()`, sentinela no `FIM`). A captura é
a rede de defesa em profundidade, e nesse caminho ela é cega. Um ensaio `--migracoes=…0002…` cujo aborto
falhasse deixaria os nomes trocados em PROD com saída VERDE, porque nenhuma função p52 mudaria.

**Dono:** 52-01 (arnês) / 52-08 (a escrita).

**Fix:** acrescentar ao `capturar()` uma impressão digital de `usuarios_rh` inteira e de `candidaturas`
(contagem + `md5(string_agg(to_jsonb(u)::text …))`, como o PRE da 0002 já calcula). O critério é «baseline
capturada na execução», sem constante. Depois, provar que morde com uma mutação que commita de propósito
num repositório de teste, ou pelo auto-teste de `diferencas`.

### WR-03: (anterior à fase) 9 itens SJT ativos têm `opcao_id` artesanal que codifica a `ordem` — o gabarito viaja no payload do candidato e no do hub

**File:** banco vivo `public.perguntas_opcao_sjt` (ids `11000001-0001-0001-0001-0000000000{a..}{1..4}`) · `src/features/avaliacao/services/avaliacaoService.ts:337-350` (`get_opcoes_sjt` → `opcao_id` ao candidato) · `supabase/migrations/20261011000001_p52_leituras_rh.sql:273` (`opcao_id` ao RH)

**Issue:** A D-37 existe porque «a `ordem` do banco é o gabarito», mas nesses 9 itens o próprio `opcao_id` é
a ordem. Medido (só leitura): 27 perguntas com opções. Em 10 delas a ordem lexicográfica do `opcao_id` é
igual à `ordem`; o esperado por acaso, com 4 opções, seria 1 em 24. As 9 artesanais (`…00a1` =
`fortemente_pontua`, `…00a2` = `pontua`, `…00a3/a4` = `atencao`) estão ativas em 7 cargos: `dentista` (3),
`asb-tsb`, `assistente-financeiro`, `consultor-vendas`, `recepcionista`, `sdr-social-seller` e
`vaga-generica`. O candidato recebe `opcao_id` de `get_opcoes_sjt`, e quem abre as ferramentas do navegador
lê a resposta certa no sufixo `1`. No hub, a ordem neutra por md5 esconde a escada na tela, mas o payload
carrega o id.

**Severidade:** warning. O 52-15 não cria nem piora isso, e o RH já lê `tag`/`ordem` direto pela policy
`rh_gerencia_opcoes_sjt` (então, para o RH, não há alargamento). O vazamento para o candidato, porém, é real
e anterior à abertura a candidatos reais.

**Dono:** bloco C (52-16/52-17), que já reescreve o banco e usa `gen_random_uuid()`. Ele retira só
`sdr-social-seller` e os cargos de marketing; os outros 6 cargos ficam. Alternativa: operador/backlog.

**Fix:** remapear os `opcao_id` artesanais para `gen_random_uuid()` numa migration controlada, atualizando as
respostas gravadas em `scores_candidato.metadata.respostas[].opcao_id`. Ou devolver ao candidato um id
opaco por sessão.

## Info

### IN-01: administrador DESATIVADO com JWT ainda válido passa nas três RPCs; a EF o recusa

**File:** `supabase/migrations/20261011000001_p52_leituras_rh.sql:144-150,240-246,337-343`

**Issue:** O helper só roda no ramo `rh`. O `custom_access_token_hook` vivo só dá papel a quem está
`ativo` (lido agora), então a janela é de no máximo um TTL de JWT (1 h). PROD tem 3 administradores
inativos. É o mesmo recorte da Phase 50 (`rh_le_scores`, `salvar_avaliacao_entrevista`), coerente com a
D-10, mas assimétrico com a EF, que exige a linha viva para os dois papéis.

**Fix:** `IF NOT public.is_active_rh_user() THEN RAISE … 42501` para os dois papéis, numa rodada futura,
ou aceitar e registrar. Dono: 52-08.

### IN-02: F4 — o log da EF registra o acesso pelo hub, não o acesso a dado pessoal

**File:** policy viva «RH pode ler todos os candidatos» · `src/features/vagas/services/candidaturasService.ts:54,86`

**Issue:** RH ativo lê `candidatos` inteiro por PostgREST sem log. A lista do RH já embute `email` e
`celular`. O cabeçalho do serviço (`cadastroCandidatoRhService.ts:7-8`, «Nenhuma tela lê estes dados por
outro caminho») vale para o hub, não para o sistema. Residual declarado. Registrar no `52-SECURITY.md` com
esta evidência. Dono: 52-14 SUMMARY.

### IN-03: F13 — o servidor aceita notas parciais e ignora em silêncio as fora de 1–5; e as notas atravessam a troca de análise

**File:** `salvar_avaliacao_entrevista` (viva) · `src/features/entrevista/components/EntrevistaScorecardInline.tsx:118-147`

**Issue:** Lido do `prosrc` vivo: `avg` só das notas numéricas entre 1 e 5. A recusa só ocorre com zero
notas. No cliente, o estado `scores` é chaveado pelo NOME da competência. Ao trocar de análise vigente no
fieldset, as notas dadas à anterior continuam marcadas nas competências homônimas da nova. Residual
declarado. Dono: 52-07 (cliente) / backlog (servidor).

### IN-04: O5/F15 — `percentil` continua na rede; o guarda do hub varre uma lista literal que não inclui quem o recebe

**File:** `src/features/avaliacao/services/scoresRhService.ts:80,133-134` · `src/__tests__/guards/p52-ban-percentil-bigfive-hub.grep.test.ts` (`ARQUIVOS_DO_HUB`)

**Issue:**
- `SCORES_ALLOWLIST` leva o `metadata` inteiro, com `dimensoes[].percentil`.
- O tipo `BigFiveDimensao.percentil` existe e é importado pelo `ScorecardAvaliacao`.
- O guarda varre 3 arquivos nomeados. Os que recebem a linha `big_five` (`ScorecardAvaliacao.tsx`,
  `scoresRhService.ts`) ficam fora. É o padrão «iteração sobre lista literal» do CLAUDE.md: o objeto novo
  fica fora da vigilância.

Residual declarado (O5). Dono: 52-11.

### IN-05: 52-25 — numa vaga sem o instrumento, uma leitura que falha mostra erro em vez de «Não se aplica»

**File:** `src/features/hub-candidato/components/HubCandidatoRH.tsx:577-581` (+ `HubSection`)

**Issue:** `isError={triagemQuery.isError}` vence o `estado` (`nao_se_aplica`). O RH vê uma falha numa seção
que nem existe para a vaga. Não há perda de dado. **Fix:** com `aplic.assincrona === 'nao_se_aplica'` e sem
dados, ignorar o erro da leitura. Dono: 52-25.

### IN-06: a 0002 nunca teve o POS provado por mutação

**File:** `scripts/p52_mutacoes.cjs` (só entradas `V01`) · evidência do tracer `p52_14_mutacoes.log` («modo: padrao prefixadas=[20261011000001]»)

**Issue:** O POS da 0002 tem três portões: literais, «outros» e «colunas». Nenhum foi visto morder. Pelo
CLAUDE.md («prove por execução que o portão ainda MORDE»), falta uma mutação que, depois da 0002, toque uma
terceira linha ou outra coluna e espere `P52N POS-PORTAO (outros|colunas)`. O risco é baixo: os UPDATE são
por `user_id`, com `ROW_COUNT = 1`. Dono: 52-08.

### IN-07: 52-15 — o modo `apply` exige HEAD = pin; qualquer commit (mesmo só de `.planning/`) entre o apply da 0001 e o da 0002 faz a segunda recusar

**File:** `52-15-PLAN.md:105-107` · `scripts/p52_portao.cjs:236-237`

**Issue:** A falha é segura (recusa), mas deixa a 0001 no ar e a 0002 parada, e o plano não diz «não commitar
entre os dois applies». O plano registra a SUMMARY só no fim, então o caminho previsto passa. **Fix:** uma
linha no Passo 1: «nenhum commit entre os dois `migrate`». Dono: 52-15.

### IN-08: 52-15 «Desfazer» do cliente herda o IN-04 do 51-REVIEW-PORTAO-3

**File:** `52-15-PLAN.md:80-83`

**Issue:** «commit de revert de `src/` para o `R`» por checkout não remove os arquivos que o push acrescenta.
São dezenas nesta fase: `ContatoCandidatoHeader.tsx`, `SairDaProvaButton.tsx`, `SjtMcDetalhe.tsx`… E reverte
em silêncio commits de cliente de outras sessões posteriores. **Fix:** derivar de
`git diff --name-status <R> <S> -- src`, `git rm` nas `A`. Dono: 52-15 (só com checkpoint; não é passo do plano).

### IN-09: comentários prometem que o 52-15 remove os casts confinados no commit do `db:types`; o 52-15 os mantém como dívida

**File:** `src/features/avaliacao/services/avaliacoesRhService.ts:57-61` (e, mais brando, `src/features/revisao/services/revisaoService.ts:464-465`, «até o db:types do 52-15») · `52-15-PLAN.md:23`

**Issue:** Instrução para um passo que o plano dono recusa fazer. Quem ler o comentário depois do 52-15 vai
achar que o cast devia ter sumido. **Fix:** corrigir o comentário no próximo commit de código («removidos
pelo plano que consumir os tipos regenerados»). Dono: 52-11/52-13.

### IN-10: miúdos da EF e do hook

**File:** `supabase/functions/ler-cadastro-candidato-rh/index.ts:341-345` · `src/features/hub-candidato/hooks/useCadastroCandidatoRh.ts:45`

**Issue:**
- `candidatos.deleted_at` não é filtrado. Hoje há 0 candidaturas vivas de titular excluído (medido), e o
  motor de exclusão anonimiza em vez de excluir.
- `retry: 2` repete 401/403/404, que não mudam: três chamadas à EF por abertura negada.
- (Anterior à fase) o cache do TanStack não é limpo no logout: o cadastro completo fica 5 min em memória
  na aba (`gcTime`).

Nenhum altera o apply. Dono: 52-09.

### IN-11: F18 — fora deste diff

**Issue:** O toggle «Ativar» sem `publish_vaga` é do bloco D (portão próprio). Nada no diff de código do
bloco B toca o caminho de publicação de vaga. Classificado aqui só para o registro dos residuais pedidos no
52-14.

---

_Reviewed: 2026-10-11T06:23:28Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
