---
phase: 51-consertos-da-jornada-bloco-3
reviewed: 2026-10-10T03:23:55Z
depth: standard
diff_base: cd92cf425b56a8b16f215052ca7807483db0fc13
reviewed_head: ef7fa24c
scope: >-
  Fase 51 inteira (103 arquivos; database.types.ts e *.generated.ts excluídos por serem gerados). Foco no
  que não teve review adversarial: a Onda A (`cd92cf42..bb629816`, planos 51-01..51-05), o
  `scripts/p51_aceite.cjs` (51-17) e as interações entre a Onda A e a Onda B. A Onda B (`bb629816..371c6f75`)
  já passou pelos portões 51-REVIEW-PORTAO-1/2/3 e os achados deles não são repetidos aqui. PROD só em leitura
  (`set transaction read only`), duas consultas: o corpo vivo de `gerar_bias_snapshot` e o de
  `pontuar_cognitivo`. Re-executado: `p51_aceite.cjs --auto-teste` (203 afirmações, ok) e o vitest das áreas
  da Onda A (54 arquivos, 619 testes, todos verdes).
files_reviewed: 103
files_reviewed_list:
  - docs/compliance/__tests__/exportAllowlist.test.ts
  - docs/compliance/__tests__/genReciboExclusao.test.ts
  - docs/compliance/catalogo-vivo-44.json
  - docs/compliance/export-allowlist.json
  - docs/compliance/export-scope-rules.yaml
  - docs/compliance/pii-inventory.md
  - docs/compliance/pii-inventory.yaml
  - docs/compliance/recibo-exclusao.json
  - docs/compliance/sql/05-export-allowlist-drift.sql
  - docs/compliance/sql/gen-recibo-exclusao.cjs
  - e2e/explicacao-flow.spec.ts
  - e2e/prova-cognitiva.spec.ts
  - scripts/p50_desfazer.cjs
  - scripts/p51_aceite.cjs
  - scripts/p51_catalogo_confere.cjs
  - scripts/p51_ensaio.cjs
  - scripts/p51_mutacoes.cjs
  - scripts/p51_portao.cjs
  - src/__tests__/guards/nomes-instrumentos.grep.test.ts
  - src/__tests__/guards/rotulos-navegacao-candidato.grep.test.ts
  - src/components/ScoreCard.tsx
  - src/components/pages/DashboardCandidatoPage.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.encerrada.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.funnel.test.tsx
  - src/components/pages/__tests__/DashboardCandidatoPage.reaberta.test.tsx
  - src/features/avaliacao-cognitiva/__tests__/ravenService.status.test.ts
  - src/features/avaliacao-cognitiva/components/AvaliacaoRavenScreen.tsx
  - src/features/avaliacao-cognitiva/components/LiberacaoCognitivoBlock.tsx
  - src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx
  - src/features/avaliacao-cognitiva/components/RavenCandidatoCard.tsx
  - src/features/avaliacao-cognitiva/components/__tests__/AvaliacaoRavenScreen.conclusao.test.tsx
  - src/features/avaliacao-cognitiva/components/__tests__/RavenCandidatoCard.test.tsx
  - src/features/avaliacao-cognitiva/components/__tests__/navegacao-cognitiva.test.tsx
  - src/features/avaliacao-cognitiva/hooks/useLiberacaoCognitivo.ts
  - src/features/avaliacao-cognitiva/hooks/useStatusRavenCandidato.ts
  - src/features/avaliacao-cognitiva/services/ravenService.ts
  - src/features/avaliacao/__tests__/avaliacaoService.funil.test.ts
  - src/features/avaliacao/components/AvaliacaoContainer.tsx
  - src/features/avaliacao/components/BigFiveQuestionnaireScreen.tsx
  - src/features/avaliacao/components/DevolutivaBigFiveView.tsx
  - src/features/avaliacao/components/RedacaoEditorScreen.tsx
  - src/features/avaliacao/components/ScorecardAvaliacao.tsx
  - src/features/avaliacao/components/SjtCasoAbertoScreen.tsx
  - src/features/avaliacao/components/SjtMultiplaEscolhaScreen.tsx
  - src/features/avaliacao/components/__tests__/AvaliacaoContainer.test.tsx
  - src/features/avaliacao/components/__tests__/ScorecardAvaliacao.test.tsx
  - src/features/avaliacao/components/__tests__/navegacao-provas.test.tsx
  - src/features/avaliacao/services/avaliacaoService.ts
  - src/features/config-vaga/components/PesosSliders.tsx
  - src/features/decisao/components/ConsolidacaoDashboard.tsx
  - src/features/decisao/components/RespostaCasoAbertoSjt.tsx
  - src/features/entrevista/components/CognitivoBandCard.tsx
  - src/features/entrevista/components/EntrevistaScorecardInline.tsx
  - src/features/entrevista/components/__tests__/EntrevistaScorecardInline.test.tsx
  - src/features/entrevista/services/entrevistaService.ts
  - src/features/explicacao/components/ExplicacaoCandidatoPage.tsx
  - src/features/explicacao/components/SolicitarRevisaoCTA.tsx
  - src/features/explicacao/components/__tests__/ExplicacaoCandidatoPage.test.tsx
  - src/features/explicacao/components/__tests__/SolicitarRevisaoCTA.test.tsx
  - src/features/explicacao/hooks/useExplicacao.ts
  - src/features/explicacao/services/__tests__/explicacaoService.test.ts
  - src/features/explicacao/services/explicacaoService.ts
  - src/features/hub-candidato/components/AvaliacoesRespondidasBloco.tsx
  - src/features/hub-candidato/components/HubCandidatoRH.tsx
  - src/features/hub-candidato/components/HubSection.tsx
  - src/features/hub-candidato/components/__tests__/hubEmptyState.test.tsx
  - src/features/hub-candidato/components/__tests__/hubVerRespostas.test.tsx
  - src/features/hub-candidato/lib/__tests__/instrumentosDaVaga.test.ts
  - src/features/hub-candidato/lib/instrumentosDaVaga.ts
  - src/features/privacidade/components/__tests__/ReciboExclusao.test.tsx
  - src/features/privacidade/services/__tests__/exportacaoService.test.ts
  - src/features/privacidade/services/exportacaoService.ts
  - src/features/revisao/components/ContextoKnockoutRevisao.tsx
  - src/features/revisao/components/FilaRevisoesTable.tsx
  - src/features/revisao/components/OrigemRevisaoBadge.tsx
  - src/features/revisao/components/ResponderRevisaoDialog.tsx
  - src/features/revisao/components/__tests__/FilaRevisoesTable.test.tsx
  - src/features/revisao/components/__tests__/ResponderRevisaoDialog.test.tsx
  - src/features/revisao/hooks/__tests__/useResponderRevisao.test.ts
  - src/features/revisao/services/__tests__/revisaoService.test.ts
  - src/features/revisao/services/revisaoService.ts
  - src/features/triagem/hooks/__tests__/useRejeitarCandidatura.test.ts
  - src/features/triagem/hooks/useRejeitarCandidatura.ts
  - src/features/triagem/services/__tests__/triagemService.test.ts
  - src/features/triagem/services/triagemService.ts
  - supabase/functions/_shared/__tests__/email-templates.test.ts
  - supabase/functions/_shared/email-templates.ts
  - supabase/functions/_shared/exportAllowlist.ts
  - supabase/functions/_shared/reciboExclusao.ts
  - supabase/functions/notificar-candidato/__tests__/notificar-candidato.test.ts
  - supabase/functions/notificar-candidato/index.ts
  - supabase/migrations/20261008000001_p51_raven_em_avaliacao_status.sql
  - supabase/migrations/20261008000002_p51_revisao_rejeicao.sql
  - supabase/migrations/20261008000003_p51_fila_tres_origens.sql
  - supabase/migrations/20261008000004_p51_motor_revisao_rejeicao.sql
  - supabase/migrations/20261008000005_p51_d23_decisor_revertido.sql
  - supabase/tests/p44_export_drift_smoke.sql
  - supabase/tests/p45_motor_exclusao_smoke.sql
  - supabase/tests/p48_prazo_reabertura_smoke.sql
  - supabase/tests/p50_acesso_recrutador_smoke.sql
  - supabase/tests/p51_catalogo_revisao_rejeicao.sql
  - supabase/tests/p51_raven_status_smoke.sql
  - supabase/tests/p51_revisao_rejeicao_smoke.sql
findings:
  critical: 0
  warning: 2
  info: 6
  total: 8
status: issues_found
---

# Phase 51: Code Review Report

**Reviewed:** 2026-10-10T03:23:55Z
**Depth:** standard (com rastreio entre arquivos nas interações entre a Onda A e a Onda B)
**Files Reviewed:** 103
**Status:** issues_found, com 0 crítico

## Summary

Parti da hipótese de que a Onda A, que não teve portão adversarial, tinha um defeito que os testes não pegavam.
Encontrei dois warnings, os dois na Onda A e os dois confirmados contra PROD em leitura:

- **WR-01.** O 51-01 mudou o destino de «Prova registrada» do painel para a lista de avaliações. A prova
  cognitiva não atualiza o cache de status. A lista abre do cache, com o card ainda em «Começar avaliação». Se o
  candidato refizer a prova, `pontuar_cognitivo` faz `DO UPDATE` e **sobrescreve a banda** que o RH vê. Medi o
  corpo vivo: há upsert e não há bloqueio de reenvio. No mesmo ciclo, o 51-07 resolveu exatamente essa classe de
  defeito para o Raven, com a mesma chave de cache.
- **WR-02.** O recibo de exclusão do 51-05 diz ao titular que o estado (UF) fica guardado «para relatório
  agregado». O inventário afirma que ele «alimenta o bias snapshot por UF». Medi o corpo vivo de
  `gerar_bias_snapshot`: ele **não lê `estado`**. A UF fica por uma restrição de schema (`check_estado`, NOT NULL,
  decisão (5) da P45), não por uma finalidade. O documento legal entregue ao titular declara uma finalidade que
  não existe.

O que conferi e está certo:

- **`scripts/p51_aceite.cjs`:**
  - toda leitura passa por `lerSoLeitura`, começa por `set transaction read only;` e recusa o resultado se
    `transaction_read_only <> 'on'` na mesma transação;
  - os ids são validados como uuid antes de entrar na interpolação;
  - nenhuma coluna pessoal é selecionada;
  - a saída passa por `valorSeguro` e `blindar`;
  - o user_id do titular só entra nas claims.

  O auto-teste rodou verde (203 afirmações). Fica um resíduo pequeno no caminho de erro (IN-01).
- **`instrumentosDaVaga`:**
  - nunca afirma «não se aplica» por ausência;
  - `getEntrevistaContexto` devolve `undefined` (desconhecido) quando o embed não vem, em vez de coagir para `[]`;
  - `nao_se_aplica` passa pelo slot de conteúdo do `AsyncState`, e carregar/erro continuam com precedência.
- **Notas obrigatórias (51-04):** a regra do cliente é igual ou mais estrita que o `btrim` do servidor.
- **Rótulos D-15:** «Matrizes» no `ScoreCard` é mesmo o Raven (`scores_raven` → `cognitivoBanda`), e
  «Prova cognitiva» no `CognitivoBandCard`, no `ConsolidacaoDashboard` e no export é mesmo o instrumento textual.
- **Recibo:** o texto da linha «sai» bate com o tombstone vivo da 0004 (cidade com sentinela, gênero e
  endereço nulos, `estado` preservado).

## Warnings

### WR-01: depois de «Prova registrada», «Voltar às avaliações» abre a lista do cache, com a prova cognitiva ainda pendente, e refazer sobrescreve o score

**Arquivos:**
- `src/features/avaliacao-cognitiva/components/ProvaCognitivaScreen.tsx:115,176-183,281-290`
- `src/features/avaliacao/components/AvaliacaoContainer.tsx:483-487,319-330`
- `pontuar_cognitivo` (vivo, `supabase/migrations/20260712100002_funil08_pontuar_cognitivo_gate.sql:141-171`)

**Issue:** O 51-01 (D-37) trocou o botão do estado `done`. Antes era `navigate('/candidato/dashboard')`; agora é
`backToList` (`/candidato/avaliacao/:id`). O `handleSubmit` não toca o cache: não tem `setQueryData` nem
`invalidateQueries` em `['avaliacao','status',id]`. O container leu essa chave ao abrir a lista, e o
`staleTime` global é de 5 min (`src/App.tsx:40`). A lista volta do cache, então:

1. `deriveCardState('cognitivo', …)` continua `pendente`, e o card mostra «Começar avaliação» (o botão só some
   quando o card está «Concluído»: `AvaliacaoContainer.tsx:319`);
2. o candidato reabre a prova, que não detecta envio anterior, e responde de novo, agora conhecendo os itens;
3. `pontuar_cognitivo` faz `ON CONFLICT … DO UPDATE SET score, metadata` em `scores_candidato` e em
   `cognitivo_respostas`, e a banda que o RH vê (`CognitivoBandCard`, hub, Decisão Final) passa a ser a da
   2ª tentativa.

Medido em PROD (só leitura): `upsert_score = true`, `bloqueia_reenvio = false`. O PC-03 do
`e2e/prova-cognitiva.spec.ts` afirma «blocked 2nd submission», mas fica atrás de `E2E_REAL_LOGIN` e só testa a
etapa que avançou, não a mesma etapa.

O 51-07 consertou exatamente essa classe de defeito para o Raven, na mesma chave
(`AvaliacaoRavenScreen.tsx:140-146`, «sem escrever a conclusão… o candidato… encontrava o MESMO convite»). A prova
cognitiva ficou de fora. O defeito do cache já existia antes (pelo painel → lista dentro de 5 min), mas o 51-01
transformou o caminho padrão pós-envio no caminho que o expõe.

O mesmo vale, sem o efeito no score, para os irmãos que já iam à lista e não invalidam o status:
- `SjtCasoAbertoScreen.tsx:150-162`;
- Big Five, pela devolutiva → `DevolutivaBigFiveView` «Voltar às avaliações»;
- Redação. A Redação só invalida `redacaoKeys.minhas`, não o status.

O SJT MC já invalida (`SjtMultiplaEscolhaScreen.tsx:166-168`).

**Fix:** no sucesso de `submitProva`, antes de `setDone(true)`, faça o mesmo que o Raven faz:
```ts
const id = candidaturaId as string
queryClient.setQueryData<AvaliacaoStatus>(avaliacaoStatusKey(id), (old) =>
  old ? { ...old, cognitivo: { ...old.cognitivo, registrado: true } } : old,
)
void queryClient.invalidateQueries({ queryKey: avaliacaoStatusKey(id) })
```
Faça o mesmo invalidate em `SjtCasoAbertoScreen`, no submit final do Big Five e no último envio da Redação.
Como defesa no servidor (fora deste conserto, com review próprio), avalie fazer `pontuar_cognitivo` recusar o
reenvio quando já existe a linha `cognitivo/raciocinio_logico`, como o Raven recusa pela PK.

### WR-02: o recibo diz que a UF fica «para relatório agregado», mas nenhum relatório lê `candidatos.estado`

**Arquivos:**
- `docs/compliance/sql/gen-recibo-exclusao.cjs:575-591`
- `docs/compliance/recibo-exclusao.json` (item `estado_e_faixa_etaria`)
- `supabase/functions/_shared/reciboExclusao.ts` (o mesmo item)
- `docs/compliance/pii-inventory.yaml:103`
- `docs/compliance/pii-inventory.md:59`

**Issue:** O item novo do 51-05 diz ao titular: «Ficam guardados o seu estado (UF) e a sua faixa etária, sem
vínculo com o seu nome, **para relatório agregado**». O inventário justifica a reclassificação com «alimenta o
relatório agregado (bias snapshot) por UF». Medi em PROD (só leitura):
`pg_get_functiondef(gerar_bias_snapshot) ~* '\mestado\M'` = **false**. No repositório, `estado` só aparece em
`20260805000003_p45_bias_k5.sql` numa fixture de teste (linha 330). Nenhuma outra função ou EF agrega por UF.

O motivo real da preservação está escrito na própria P45 (`20260805000006_p45_anonimizar_candidato.sql:130-142`):
`estado` é `bpchar NOT NULL` com `check_estado` nas 27 UFs, e «não existe valor "removido" válido». Ou seja, é
uma restrição técnica, não uma finalidade. A metade «faixa etária» da frase é verdadeira (`faixa_etaria_materializada`
é lida pelo snapshot). A metade «estado» não é.

Isso conta como finding, e não como imprecisão de cópia, por três motivos:
- o recibo é o documento que a fase existe para tornar exato (JORN-49: «o recibo diz o que sai e o que fica»);
- declarar ao titular uma finalidade inexistente fere o princípio da finalidade e o da transparência (LGPD,
  Art. 6º, I e VI; Art. 9º);
- a base legal citada (Art. 16, IV) pressupõe uso pelo controlador, e o uso declarado não existe.

É o padrão da memória «ressalva infundada»: o texto parece rigoroso e está errado.

**Fix:** separe as duas razões, ou diga a verdadeira. Por exemplo, mantenha a faixa etária com «para relatório
agregado» e escreva para a UF: «Fica guardada a sigla do seu estado (UF), sozinha e sem vínculo com o seu nome —
o cadastro exige uma UF válida e não há como apagá-la sem alterar a estrutura do banco». Corrija também a nota do
`pii-inventory.yaml`/`.md`, regenere o recibo (`gen-recibo-exclusao.cjs`), o `reciboExclusao.ts` da EF e o
`.generated.ts` do cliente, e atualize o `genReciboExclusao.test.ts`. Se a intenção for de fato agregar por UF,
o caminho inverso é fazer `gerar_bias_snapshot` usá-la, com a supressão k=5 por célula. Mas aí a mudança é de
produto e não cabe num conserto de texto.

## Info

### IN-01: no caminho de erro, o `p51_aceite` pode repassar um trecho do SQL com o user_id do titular

**File:** `scripts/p51_aceite.cjs:302-304`

**Issue:** Quando o `p46apply` falha, ele imprime `HTTP <n>: <corpo>` numa única linha física, porque o
`\n` da mensagem do Postgres vem escapado no JSON. O aceite repassa os 200 primeiros caracteres depois do
`blindar`, e o `blindar` não redige uuid (36 < 40). Um erro com excerto `LINE n:` na consulta `p51:titular` pode
trazer o `set_config('request.jwt.claims','{"sub":"<titular>"…`. O cabeçalho promete «nunca imprime o user_id
do titular». O risco é baixo: precisa de um erro de parse ou de posição exatamente naquela linha, e o dado é
pseudônimo.

**Fix:** no caminho de erro, imprima só o SQLSTATE e a 1ª frase (`/ERROR:\s+(\w{5}):\s*([^\\]*)/`), ou passe a
mensagem por um redator que troque uuids por `<uuid>`.

### IN-02: o hub mostra a contagem de avaliações respondidas duas vezes

**File:** `src/features/hub-candidato/components/HubCandidatoRH.tsx:443` · `src/features/hub-candidato/components/AvaliacoesRespondidasBloco.tsx:57-60`

**Issue:** Em `com_dados`, a seção «Avaliação Assíncrona» diz «N avaliações respondidas», e o bloco irmão logo
abaixo repete a mesma frase ao lado do «Ver respostas». As duas vêm da mesma função, então nunca divergem. É só
ruído.

**Fix:** no bloco, mostre a contagem só quando a seção acima não está em `com_dados`, ou tire o parágrafo do
`HubSection`.

### IN-03: «Big Five — Não fez» aparece para quem está com o Big Five em andamento e para vaga que não o aplica

**File:** `src/features/avaliacao/components/ScorecardAvaliacao.tsx:366`

**Issue:** `estadoBigFive(rows)` só olha se existe linha `big_five` em `scores_candidato`. Com o questionário
iniciado (autosave), ou numa vaga cujo `testes_aplicaveis` não traz `big_five`, o detalhe afirma «Não fez». É a
inferência por ausência que o `instrumentosDaVaga` (51-03) proíbe na mesma tela. Hoje todos os templates incluem
`big_five`, por isso o efeito é pequeno.

**Fix:** passe `instrumentosDaVaga(...).assincrona` e o `iniciado` do status para o detalhe, ou aceite e
registre ao lado do D-19.

### IN-04: a cópia ainda manda «acompanhar pelo painel» num estado cujo botão leva à lista

**File:** `src/features/avaliacao/components/DevolutivaBigFiveView.tsx:174` · `src/features/avaliacao/components/RedacaoEditorScreen.tsx:320`

**Issue:** «Acompanhe o andamento pelo seu painel.» aparece logo acima de «Voltar às avaliações». O D-25/D-37
existe para que o rótulo diga para onde o botão vai, e o parágrafo contradiz o botão.

**Fix:** «Acompanhe o andamento pela lista de avaliações», ou acrescente um segundo botão «Ir ao painel».

### IN-05: o guarda de rótulos confere o texto, não o destino

**File:** `src/__tests__/guards/rotulos-navegacao-candidato.grep.test.ts:72-94`

**Issue:** O guarda reprova «Voltar ao painel» e exige que «Voltar às avaliações» e «Ir ao painel» existam. Um
botão «Ir ao painel» com `onClick={backToList}` passa verde. O defeito original do C-11 era justamente um rótulo
apontando para o destino errado. Os testes de comportamento (`navegacao-provas`, `navegacao-cognitiva`) cobrem as
telas de hoje, mas não as que vierem depois.

**Fix:** acrescente uma varredura por forma: em cada arquivo, todo `onClick` de um botão cujo filho é
`COPY_NAV.irAoPainel`/`COPY.irAoPainel` resolve para um handler cujo corpo contém `'/candidato/dashboard'`. Ou
centralize os pares rótulo→rota numa única constante e importe dela.

### IN-06: o `p51_aceite` fabrica as claims de papel em vez de lê-las

**File:** `scripts/p51_aceite.cjs:186,237-253,367-371`

**Issue:** As claims das leituras de fila e funil fixam `role: 'rh'` para o RH2 e `'administrador'` para o
admin, sem `set local role authenticated`. A conferência `perfil:*` confere o papel em `usuarios_rh`, mas o
token real do operador na sessão não é o que a sonda simula. Se o hook de access token emitisse outro valor, a
sonda continuaria verde. É coerente com o escopo declarado (as RPCs DEFINER «dependem só das claims»), mas vale
dizer no SUMMARY que o aceite prova a regra do servidor sob claims sintéticas, não a sessão real do navegador.

**Fix:** derive `papel` de `perfil_*.role` (`administrador` → `'administrador'`, senão `'rh'`) para que as
claims sejam as que o hook emitiria, ou registre a ressalva.

---

_Reviewed: 2026-10-10T03:23:55Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
