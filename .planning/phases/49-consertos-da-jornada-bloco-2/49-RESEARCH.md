# Phase 49: Consertos da Jornada — Bloco 2 - Research

**Researched:** 2026-09-22
**Domain:** Supabase (PL/pgSQL SECURITY DEFINER + triggers + pg_cron), Edge Functions Deno com `@anthropic-ai/sdk@0.102.0` / `openai@6.42.0`, React/TS — consertos de verdade do dado em PROD, com escrita retroativa e mecanismo destrutivo (motor de exclusão)
**Confidence:** HIGH no estado vivo (definições por `pg_get_functiondef`, catálogo, contagens `SET TRANSACTION READ ONLY`, SDK lido do cache do Deno); MEDIUM nos desenhos recomendados e na conta do D-29 (modelo por candidato estimado de 4 saídas); LOW onde marcado `[ASSUMED]`

> **Leitura para o operador (portão antes do plano).** O que volta a você está em quatro lugares:
> §«Correções de fato» (35 itens; 7 mudam o plano: 4, 5, 13, 14, 16, 19, 20), §«D-29 — teto de candidatos do comparativo
> (proposta)», §«Portão antes do plano — o que volta ao operador» (itens 3 e 4, e duas decisões novas
> que a medição criou), e §«Open Questions». O resto é para o planejador.

<user_constraints>
## User Constraints (from CONTEXT.md)

> Copiado verbatim de `49-CONTEXT.md` (§Decisões, §Claude's Discretion, §Deferred Ideas). Só os títulos `###` desceram um nível.

### Locked Decisions

#### Herdadas do operador — NÃO reabrir

- **JORNADA D1–D8** (`JORNADA-GUIADA.md` §«DECISÕES TOMADAS»). As que incidem aqui:
  - **D4**: append por etapa; a tela mostra a mais recente, com as anteriores acessíveis;
    sobrescrever é o modo de falha. O alcance foi esclarecido neste kickoff, em D-37.
  - **D8**: avançar não exige evidência.
- **Phase 48 D-01..D-23** (`48-CONTEXT.md`). As que incidem aqui:
  - **D-01**: a reabertura `rejeitado → decisao_final` é transição **sancionada**. A trava do
    JORN-25 tem de deixá-la passar.
  - **D-02**: o padrão «marcar, não apagar».
  - **D-07**: nenhum texto novo introduz ocorrência literal do endereço do canal de privacidade.
  - **D-14**: decisão do operador inexequível como escrita → o executor para e reporta.
  - **D-15..D-19**: ambiente; repetidas abaixo como restrições.
  - **D-21**: predicado canônico `candidatura_encerrada`, para reusar e não recriar.
- **Exceção de linguagem já decidida** (`CLAUDE.md`, operador 2026-09-22): o disclaimer negado da
  devolutiva («… não é teste psicológico») fica.

#### Decisões de produto e LGPD do operador (kickoff 2026-09-22)

> Seção separada de propósito. São escolhas do operador sobre **o que** o produto faz. Nenhum plano
> as reinterpreta. A numeração continua a da Phase 48 (D-24 em diante) para não colidir com
> D-01..D-23 nem com D1–D8.

**Rubrica da redação (JORN-07)**

- **D-24:** A rubrica canônica da redação cultural é a **BARS do PRD v1.1**:
  - D1 Especificidade da situação
  - D2 Ação demonstrada
  - D3 Aprendizado/Reflexão
  - D4 Alinhamento com os valores Beauty Smile (os 4 valores moram **dentro** da D4)

  Fontes: `docs/prds/m2-funil-rh/PRD-redacao-fit-cultural.md` (binding) e
  `docs/conhecimento/fit-cultural/bars-redacao-4-dimensoes.md` v1.1. **Não** são os 4 valores
  como D1–D4: esse mapeamento nasceu na Phase 13 contra o PRD, e o conserto como estava escrito na
  fila o cravaria por teste.
  - O cap `D1 ≤ 2 → no máximo 50, 'situacao_generica_ou_inventada'` segue válido. É o significado
    que ele sempre teve.
  - O comentário falso de `_shared/essay-schemas.ts:19-20` sai.
  - **Reversibility:** costly. A rubrica define o que a nota consolidada significa. Voltar atrás
    exige nova versão de prompt e reavaliação.
- **D-25:** A tela de revisão da redação mostra **rótulos fixos vindos de uma única constante**,
  a mesma que alimenta a rubrica enviada ao modelo. Nunca por posição com um mapa próprio da tela.
  Mostra também o **raciocínio e as citações** que a IA já grava. Hoje a tela lê
  `analise_ia.reasoning`/`citacoes`, que não existem, e mostra só 4 números.
- **D-26:** As 2 redações já avaliadas com a rubrica fantasma (ambas de conta de teste) **ficam como
  estão**. A rubrica nova entra com **versão própria gravada na linha**, e a tela distingue as
  antigas pela versão. Nenhuma escrita retroativa.

**Modelo e fallback (JORN-28, liga à P1)**

- **D-27:** **O fallback continua, visível.** Quando o Sonnet falha (não coube, demorou, saiu do
  schema), o resultado ainda pode sair do `gpt-4o-mini`, mas:
  - (a) **o resultado carrega o modelo real** (D-28);
  - (b) **a tela do resultado mostra a troca**: comparativo, análise, guia, análise de entrevista
    e redação, **inclusive o PDF exportado do comparativo**;
  - (c) **o log de IA do admin** deixa de mostrar «Sucesso» verde para fallback. A linha ganha
    estado próprio e a **causa separada**: não coube / demorou / fora do schema.

  Sem aviso ativo ao admin (opção oferecida e não escolhida). A escolha do modelo (P1) fica fora.
- **D-28:** **Proveniência por coluna em cada tabela de resultado.** Provedor e modelo **reais** em:
  - `analise_candidato_vaga`
  - `comparativo_solicitado`
  - `entrevista_guias`
  - `entrevista_analises`
  - `redacoes_candidato`, que hoje grava o modelo **configurado**, e isso passa a ser defeito

  Sobrevive à purga de 180 dias do `ai_call_logs`. Coluna nova passa pelo checklist LGPD
  (§Restrições, D-49).
- **D-29:** **O comparativo baixa o teto de candidatos** em vez de encurtar a saída ou esticar o
  tempo. **O número é medido pela pesquisa e volta ao operador antes do plano.** Critério: o maior
  teto cuja saída cabe em 110 s com folga, no throughput medido do Sonnet (45–59 tok/s em PROD).
  O `max_tokens` é dimensionado junto.
- **D-30:** Os resultados já gerados por fallback (comparativos de 06/09 e 20/09, 1 guia presencial;
  todos de teste) **ficam como estão**, com proveniência «desconhecida» na coluna nova. Nenhuma
  escrita retroativa.

**Card da lista do RH (JORN-13, JORN-40)**

- **D-31:** Célula **Big Five = «concluído» / «não fez»**, sem número e sem cor de nota. Respeita
  UX-07/RNF-07a: Big Five é não avaliativo. As faixas seguem no hub.
- **D-32:** Célula **Cultura = só a nota revisada por humano**: `scores_candidato` com
  `tipo='redacao'`, gravada por `sincronizar_score_redacao` depois da revisão.
  - Antes da revisão: «aguardando revisão».
  - Sem redação: «não fez».
  - Nunca a sugestão da IA de `redacoes_candidato`.
- **D-33:** **DISC sai do card** (não existe no produto). **Inteligência = faixa do Raven, sem
  percentil**, ou «não fez». A mesma regra vale para o hub (JORN-40): o `LiberacaoCognitivoBlock`
  deixa de mostrar o percentil cru.
- **Invariante do 13:** ausência nunca vira `0`. Zero é a pior nota, não «sem dado».

**Comparativo (JORN-25)**

- **D-34:** Na seleção do comparativo da vaga, **candidatura encerrada aparece com selo e não é
  selecionável**. A **Edge Function também recusa** encerrada (defesa no servidor), com mensagem
  **verdadeira**. Hoje um knockout sem análise faz a EF dizer «pertencem a vagas diferentes».
  - «Encerrada» é o predicado canônico `candidatura_encerrada` da Phase 48, sem critério novo.
  - Retirada a pedido **não** é encerrada por esse predicado, por desenho, e segue selecionável.
- **D-35:** **Trava no banco e no e-mail.**
  - O trigger `avancar_etapa` recusa mover uma candidatura **encerrada**, exceto a reabertura
    sancionada do D-01 e as transições terminais que o próprio sistema grava (decisão,
    rejeição, knockout).
  - O `notificar-candidato` recusa o evento `avanco` para candidatura encerrada. Hoje a guarda de
    knockout só cobre `confirmacao`.
  - Motivo: só isso fecha o caso medido. Knockout (`inscricao`/`rejeitado`) → «Avançar» →
    `avaliacao_assincrona` é avanço **aceito**, grava histórico e dispara e-mail de avanço.
  - Não é portão de evidência: D8 intacto.
  - **Reversibility:** costly. Trigger central do funil, e toda escrita de etapa passa por ele.
- **D-36:** O «Avançar» do comparativo leva à **próxima etapa real** de cada candidato, pelo mesmo
  caminho do hub. Hoje grava sempre `avaliacao_assincrona`.
- **D-36b:** O comparativo da tela de decisão final passa a comparar quem está em
  **`etapa_atual='decisao_final'` e não encerrada**. Hoje compara quem tem linha em `decisao_final`,
  quase todos já encerrados. O texto «em decisão final» da tela passa a ser verdade.

**Transcrição e análises de entrevista (JORN-12)**

- **D-37:** Alcance da D4 nesta fase: **só a análise da entrevista** (`entrevista_analises`). A
  análise da triagem (`analise_candidato_vaga`, sobrescrita ao reprocessar) fica registrada para
  depois (§Deferred).
- **D-38 (LGPD):** **Hash + vínculo com o log.** A análise guarda o **hash** do texto analisado e o
  **id da linha** do `ai_call_logs` que o contém. **Nenhuma coluna de conteúdo nova.**
  - O texto mascarado segue onde já está (`ai_call_logs.user_prompt_template`, só admin, 180 dias).
  - Fato que pesou: esse texto **já existe** no banco, com nomes e fala literais, e sem vínculo.
  - Consequência aceita: depois de 180 dias o vínculo aponta para o vazio, e o RH não lê o texto.
  - **Reversibility:** reversible. Guardar o texto depois é aditivo; o hash não impede.
- **D-39:** **Vigente = a mais recente bem-sucedida, dentro da mesma entrevista (tipo).**
  - Análise que falhou (competências nulas, injeção) **nunca** é vigente.
  - As anteriores ficam **marcadas como superadas**, não apagadas, e acessíveis (D4).
  - O **portão de avanço** (`avancar_etapa`, bandeira de linguagem) e a **revisão humana**
    (`salvar_avaliacao_entrevista`, `confirmar_revisao_entrevista`) olham **só a vigente**.
  - Hoje eles discordam: o portão olha **todas**, e uma bandeira antiga escondida bloqueia o avanço.
- **D-40:** **Reanalisar o mesmo texto (cache) não cria linha.** Devolve a existente; só texto
  diferente gera análise nova.
- **D-41:** **O RH escolhe o tipo (online/presencial)** na aba da transcrição, com a etapa atual
  como padrão. É o mesmo seletor da aba do guia. É isso que liga a análise à entrevista.
- **D-42:** **Análise nova depois de revisão humana volta a aguardar revisão** antes de pesar
  (RNF-07a). A revisão anterior continua **visível** na análise superada, com quem revisou e quando.
  Hoje ela some: o upsert zera o score e descarta `scores_humanos`.
- **D-43:** As **6 análises existentes** (3 candidaturas, todas de teste) são **marcadas**
  retroativamente: vigente/superada. É escrita aditiva só de marcação, com contagem antes/depois.
  Hash e vínculo ficam nulos onde não der para reconstruir.

**Trilha da decisão (JORN-17, JORN-3b, JORN-37)**

- **D-44:** **Snapshot = qualquer mudança real, menos leitura e telemetria.**
  - `trg_decisao_final_snapshot` arquiva quando muda qualquer coluna, **exceto**
    `explicacao_solicitada_em` (carimbo de leitura) e `alerta_prazo_enviado_em` (telemetria).
  - **UPDATE que não muda nada nunca arquiva.**
  - Continuam arquivando: decisão, ciclo de revisão, reabertura e o tombstone do motor de
    exclusão. Os testes da Phase 48 e a ordem snapshot→scrub do `anonimizar_candidato` dependem
    disso.
  - **Reversibility:** reversible.
- **D-45:** Os **5 snapshots sem mudança** que já existem (todos de teste) **ficam**. O arquivo só
  aceita acréscimo (ERASE-08) e vai na cópia do titular.
- **D-46:** As **9 candidaturas com `etapa_justificativa` grudada** (8 de teste, 1 real com 5
  caracteres) são **limpas**.
  - É UPDATE retroativo com **checkpoint** e contagem antes/depois.
  - As 9 batem md5 com o `criterio_texto` mais recente do histórico, então nada se perde.
  - A cópia do titular passa a mostrar a coluna vazia; o texto segue no histórico.
  - **Reversibility:** reversible. O valor está no histórico, byte a byte.
- **D-47 (LGPD, JORN-37):** **BD-9 mantido: a trilha deixa de copiar a justificativa da decisão
  final.**
  - `registrar_decisao` para de escrever o texto da decisão em `etapa_justificativa` (e, por
    consequência, em `historico_candidatura.criterio_texto`).
  - O histórico registra que houve a decisão, não o texto.
  - **As 4 cópias que já estão no histórico** (3 de teste, 1 de conta real, candidatura
    `d31c78bb`) **são limpas**, com checkpoint, contagem e aprovação do operador no momento.
  - O texto continua em `decisao_final.justificativa`, que é a fonte.
  - **Reversibility:** costly. Edita a trilha de auditoria; o texto é recuperável da fonte.

**Recibo × motor de exclusão (JORN-36)**

- **D-48:** **O motor passa a apagar o que o recibo promete.** O recibo, item
  `respostas_e_producoes` de `docs/compliance/sql/gen-recibo-exclusao.cjs`, diz no passado que
  transcrições, textos e respostas «foram apagados».
  - `anonimizar_candidato` hoje **não toca** em `redacoes_candidato.texto`,
    `entrevista_analises.citacoes`, `respostas_*`, `scores_candidato.citacoes`,
    `devolutivas_candidato.conteudo_jsonb` **nem** em `ai_call_logs.user_prompt_template`.
  - O motor ganha o passo que falta, e o recibo fica verdadeiro.
  - Medido: a única exclusão concluída (22/08) era de titular **sem** esses dados. O recibo ainda
    não mentiu para ninguém, mas mentiria.
  - **Mecanismo destrutivo:** apply com portão, prova em conta de teste e o
    `p45_motor_exclusao_smoke.sql` ampliado para cada coluna nova do passo.
  - **Reversibility:** one-way. Cada exclusão executada pelo passo novo é irreversível por
    desenho, e o recibo afirma isso ao titular.

**Achados da mesma classe que entram (decisão do operador: todos)**

JORN-32, 33, 34, 35, 38, 39 entram com o conserto óbvio de cada um. A forma exata fica em Claude's
Discretion, com as restrições abaixo.

#### Restrições de execução — NÃO negociáveis (operador, kickoff)

- **D-49: Espere a pesquisa desmentir a fila, e desmentir este CONTEXT.** No Bloco 1 a pesquisa
  corrigiu 4 premissas por medição em PROD; neste kickoff a medição já corrigiu mais de 30 (§Correções).
  A pesquisa **mede de novo** o que for load-bearing para o plano, em vez de copiar daqui. Toda
  correção nova vai para uma seção **«Correções de fato»** do `49-RESEARCH.md` e **volta ao operador
  antes do plano** (§Portão antes do plano).
- **D-50: Varra pela forma antes de consertar cada defeito** (`CLAUDE.md` §«Portões»). Cada item tem
  uma classe (tabela §Integração), e a varredura dela sai como **artefato** com:
  - o padrão de busca, para poder ser re-rodado;
  - cada ocorrência classificada como *defeito* ou *escopo deliberado*;
  - a cobertura de `src/`, `supabase/functions/` **e das definições VIVAS** do banco
    (`pg_get_functiondef` / migration mais recente do objeto).

  As varreduras do kickoff (§Correções) são o ponto de partida, não a varredura final.
- **D-51: Confira no banco, nunca só na tela.** Todo critério de aceite de comportamento em PROD é
  uma consulta com resultado esperado.
- **D-52: Via do projeto.**
  - Migrations por `node p46apply.cjs migrate`: SQL lido do arquivo, ledger na mesma requisição, md5
    conferido.
  - Edge Functions por `node efdeploy.cjs <slug>`: conferir o fechamento de imports com
    `--dry-run`, porque o cabeçalho do script afirma uma checagem que não existe
    (deferred-items da 48).
  - **Depois de todo apply com efeito visível: `git log --oneline origin/main..HEAD` sai vazio.** A
    Vercel publica do `main`.
  - Para conferir marcador no ar, procurar no **chunk certo**: `/rh/*` e `/admin/*` são lazy.
  - Nunca SQL Editor nem `apply_migration` do MCP.
- **D-53: `tsc` não sobe acima de 90.** Todo plano que toca TS roda `npm run lint` e reprova acima de
  90.
- **D-54: Portão de escrita em PROD** (divisão do operador, memória «aditivo autônomo, destrutivo
  com portão»).
  - **Sem pausa**, reportando cada apply: aditivo e corretivo. Isso cobre CREATE, ADD COLUMN,
    CREATE OR REPLACE, deploy de EF e smoke.
  - **Checkpoint com contagem antes/depois:** UPDATE/DELETE retroativo sobre linha existente.
    Nesta fase: D-43 (marcar 6), D-46 (limpar 9) e D-47 (limpar 4 do histórico).
  - **Checkpoint:** a primeira execução real do passo novo do motor (D-48), e qualquer e-mail a
    candidato real fora do fluxo normal.
  - **Apagar linha exige decisão explícita do operador.** Nenhuma escrita desta fase apaga linha.
- **D-55: Sequência obrigatória tem dono.** Antes de todo deploy com sequência
  `migration → EF → cliente`, o passo seguinte pertence a um plano desta fase. Colunas novas de
  resultado (D-28) e de análise (D-38/D-39/D-41) quebram o cliente e as EFs se chegarem fora de
  ordem.
- **D-56: Portões são código** (D-17 da 48; `CLAUDE.md`). Antes de acrescentar objeto que um smoke
  vigia, e **antes de mudar comportamento que um smoke assere**, faça as duas coisas:
  - rode a varredura (282 linhas hoje) e classifique cada achado tocado;
  - depois do conserto, **prove que o portão ainda morde**.

  Já identificados:
  - `p48_rejeicao_triagem_smoke.sql:239,245` (o 245 reprova com D-46/17; o 239 vira vazio);
  - `p48_reabertura_smoke.sql` (a)(g)(h) e `p48_prova_prod.sql:89-96,201-209` (dependem de
    snapshot no ciclo — D-44 tem de preservá-los);
  - `oper31_rejeitar_candidatura_smokes.sql:162-183` (a regra de regressão; D-35 mexe no mesmo
    trigger);
  - `ai-client.test.ts:289-298,306-338,437-453,460-479,646` (asserem o fallback e o `error_code`
    de hoje);
  - `RedacaoOverrideForm.test.tsx:35-38` (trava os rótulos errados);
  - `ScoreCard.test.tsx`, `ComparativoScreen.test.tsx:121`, `TriagemTable.test.tsx:~188` (a
    invariante da Phase 45: retirada segue visível);
  - `comparativo-candidatos/__tests__/index.test.ts:191-259`.
- **D-57: Coluna nova = checklist LGPD completo** (precedente 48-17). Vale para toda coluna nova em
  tabela inventariada: proveniência (D-28), hash/vínculo/vigente/tipo/autor (D-38..D-41) e
  qualquer marca.
  1. `p46apply`.
  2. `db:types` com `< /dev/null` (memória: sem isso pendura e trunca).
  3. `meta.acrescimos` em `catalogo-vivo-44.json`.
  4. Veredito em `export-scope-rules.yaml`.
  5. Classificação em `pii-inventory.yaml` e regeneração do `.md`.
  6. Linha ou razão em `gen-recibo-exclusao.cjs`, e regeneração do recibo e dos dois espelhos TS.
  7. Regeneração de `export-allowlist.json` e `_shared/exportAllowlist.ts`, com bump da versão
     (hoje 1.2.0).
  8. Os dois blocos VALUES do `05-export-allowlist-drift.sql` e os snapshots inline de
     `exportAllowlist.test.ts`.
  9. Os quatro `check:`.
  10. Redeploy de `exportar-meus-dados` e `executar-direito-titular`.

  UUID de funcionário segue o precedente `revisada_por`: fora do export, «dado_de_funcionario» no
  recibo.
- **D-58: Linguagem de produto.**
  - «avaliação comportamental/cognitiva», nunca «teste psicológico» (exceção D já decidida acima).
  - O sistema nunca rejeita por score (RNF-07a).
  - Todo texto novo passa pelo guard `forbidden-strings.grep.test.ts`.
  - Nenhuma ocorrência literal nova do canal de privacidade (D-07).


### Claude's Discretion


**JORN-07**
- Onde a rubrica mora. Pode ser um bloco injetado pela EF a partir de uma constante versionada no
  repo; o prompt já diz «use as âncoras BARS fornecidas no input», e é o padrão de
  `avaliar-transcricao-entrevista/_local/bars-rubric.ts`. Pode ser também uma versão nova de
  prompt, ou os dois.
  - Se houver versão nova: `prompt_versions` é **imutável por trigger** (texto novo = linha nova
    via migration + promote).
  - `unique_active_per_type` **não** é índice único, e `loadPrompt` usa `maybeSingle`: duas ativas
    quebram o carregamento.
  - `SCHEMA_VERSIONS`/`schema_version_required` andam juntos se o schema mudar.
- Se entram as redações-exemplo (few-shot) de `exemplos-respostas-bars.md`. Custa tokens.
- Onde a verificação de `dimension_name` mora: literal por chave no schema (bump), checagem depois
  do parse, ou ambos.
  - **Obrigatório:** um teste que reprova se a rubrica enviada e os rótulos da tela divergirem, e
    um que reprova se o nome devolvido não bater com a chave.
  - Qualquer schema novo segue compatível com os dois SDKs (`structured-output-compat.test.ts`).
- Registrar a versão da rubrica na linha do resultado. **Obrigatório por D-26**: é como a tela
  distingue as antigas.
- A colisão de códigos: `perguntas_redacao` usa D1/D2/D3 como código de pergunta dentro do mesmo
  bloco injetado.

**JORN-28**
- A taxonomia exata do `error_code` (no mínimo: truncamento / timeout / schema / 5xx-overload /
  circuito aberto) e como detectar truncamento.
  - `stop_reason === 'max_tokens'` via `messages.create`, ou reconhecimento da mensagem do parser.
  - O `parse()` do SDK lança antes de devolver `stop_reason`/`usage`.
- O significado de `success` numa linha de fallback. Ele afeta o `error_count` do
  `ai_cost_daily`, o teto de custo AI-06 (que soma só `success=true`) e a elegibilidade do replay.
- Gravar a tentativa Anthropic truncada, que foi cobrada (≈ US$ 0,058) e hoje não aparece em
  lugar nenhum.
- Se falha de tamanho de saída conta para o circuit breaker.
- **Obrigatório:**
  - O replay de idempotência **não pode esconder** que o resultado veio de fallback (ele replaya
    linhas `success=true` de fallback hoje).
  - O fallback **respeita** `max_tokens`/`temperature` configurados (hoje ignora, `ai-client.ts:742-749`).
- **Varredura D-50 obrigatória:** `max_tokens` × saída real de **todos** os `call_type`. A classe
  «não coube» já tinha sido achada em 05–06/09 e a varredura parou antes de `comparative_ranking`
  (3000), `work_sample_sjt` (3000) e `culture_fit_essay` (2500).

**JORN-13**
- A consulta da lista. Um embed de `scores_candidato` filtrado por `tipo` basta, sem N+1; existe
  `idx_scores_candidatura`.
  - A aba «Por Vaga» (`candidaturasService.ts:676-706`) hoje nem busca notas e passa a ler a mesma
    fonte.
  - Tirar os embeds mortos (`scores_bigfive`, `scores_disc`) e o `analise_ia_cultura`.
  - A cor verde/vermelha não se aplica a Big Five.

**JORN-25**
- O desenho exato da exceção da trava (D-35) para as transições sancionadas: reabertura D-01,
  `registrar_decisao`, `rejeitar_candidatura`, knockout. Ler cada uma no vivo.
- **Obrigatório, achado na varredura (mesma classe do 7, «rotular por posição»):**
  - Hoje a tela resolve `C{n}` → nome pela **posição** na lista selecionada.
  - A EF ordena por `score_match` e o painel ordena sem desempate (`triagemService.ts:211`). A
    tela da decisão nem resolve nomes (`DecisaoFinalPage.tsx:67-78`).
  - A EF passa a devolver o `candidatura_id` de cada posição, e a tela rotula por ele.
  - Com empate de `score_match`, o ranking pode hoje mostrar o nome errado.

**JORN-12**
- Como o hash é calculado: sobre o texto mascarado ou o original, e com qual normalização. Um hash
  sobre o texto mascarado muda se o código da máscara mudar.
- Como o vínculo com o log é gravado.
- **Obrigatório:**
  - Os INSERTs da EF de transcrição passam a checar erro. Hoje uma escrita falha devolve `{ok:true}`.
  - A linha de falha (competências nulas) nunca desloca a vigente.

**JORN-3b**
- O mecanismo de D-44: cláusula `WHEN` comparando OLD/NEW sem as colunas excluídas, guarda dentro
  da função, ou os dois. Também tornar o carimbo idempotente
  (`WHERE explicacao_solicitada_em IS NULL`).
- **Obrigatório:** a cópia usa lista explícita de colunas, e coluna nova em `decisao_final` some
  do arquivo **sem erro**. Um teste reprova quando `decisao_final` e `decisao_final_historico`
  divergirem de colunas.

**JORN-17**
- Onde limpar: `NEW.etapa_justificativa := NULL` depois do INSERT no histórico, na mesma função
  BEFORE (`avancar_etapa`, última definição `20260712110001`).
  - Medido: o portão (L17-20) e a cópia (L40-47) estão na mesma função, e nenhum trigger posterior
    lê a coluna.
  - Conferir que nenhuma transição sancionada depende de o valor sobreviver ao UPDATE.

**JORN-32..35, 38, 39**
- A forma de cada um:
  - 32: comparar a vaga das análises com `body.vaga_id`;
  - 33: o selo usa o predicado canônico;
  - 34: status de encerrada só pelo caminho auditado, ou recusado;
  - 35: injetar `perguntas.rubric` e aplicar pesos pela chave, não pelo nome devolvido;
  - 38: allowlist de colunas no select;
  - 39: um valor válido no enum, ou `provider` nulo com `error_code`, e o erro deixa de ser
    engolido pelo `audit-logger.ts:179-185`.

**Geral**
- Granularidade dos planos, waves e ordem, respeitando §Integração e D-55.


### Deferred Ideas (OUT OF SCOPE)


- **Blocos 3 e 4** da fila, inteiros. Inclui o Defeito 29 (admin sem navegação, custos sem coluna de modelo), que o D-27(c) **não** conserta: o D-27 só muda a linha do log.
- **P1** — escolha do modelo das funções de IA. O modelo de fallback segue hardcoded (`ai-client.ts:61`), `prompt_versions` não tem coluna de fallback, e `COST_PER_TOKEN` custeia modelo desconhecido em 0 sem aviso (`ai-cost.ts`). Trocar de modelo muda o throughput e, com ele, a conta do D-29.
- **D4 para a análise da triagem** (`analise_candidato_vaga`, sobrescrita ao reprocessar) — D-37.
- **Defeito 15b** — justificativa em cada avanço humano; não está em bloco nenhum e esbarra no D8.
- **`getGuia` sem filtro de tipo** (`entrevistaService.ts:405-410`): pega o guia mais recente de qualquer tipo; o online e o presencial podem se misturar. Achado no kickoff, **não perguntado ao operador**.
- **Guia presencial lê as notas da IA, nunca as confirmadas pelo humano** (`weakDims`). Achado no kickoff, não perguntado.
- **Policies de candidato em `scores_raven`/`scores_bigfive`/`scores_disc`** comparam `c.candidato_id = auth.uid()`, o que casa 0 de 44: o candidato nunca lê as próprias linhas. Verificar se alguma tela do candidato precisa; não perguntado.
- **`score_geral`** (0 de 38 preenchidos): coluna morta, mas escondida quando nula. Não é o defeito 13.
- **`entrevistas_online` / `entrevistas_presenciais`**: tabelas sem escritor, com 5 linhas de seed. Candidatas a limpeza de schema.
- **Escrituração:** acrescentar os Defeitos 32–40 à tabela «Defeitos — acumulado» e à fila da `JORNADA-GUIADA.md` (com o arquivo fechado no editor, regra 5); atualizar o número da varredura de portões no `CLAUDE.md` (244 → 282).
- **`CLAUDE.md` §«Portões»**: acrescentar ao padrão as listas literais declaradas (`text[] := ARRAY[`) e as contagens em `<> (CASE …)` (item aberto do 48-06).

#### Reviewed Todos (not folded)
Os 16 todos pendentes que o `todo.match-phase 49` devolveu casaram só por palavra genérica («phase», «plano», «checkpoint»), com score 0,4–0,6. Nenhum é do Bloco 2. Não foram incorporados. O mais próximo em espírito, `gsd-execucao-paralela-sem-isolamento.md` (planos paralelos sobre o mesmo índice git), é de processo de execução e vale para o `/gsd-execute-phase`, não para o escopo.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| JORN-28 | Troca de modelo nunca silenciosa; proveniência real; selo na tela e no PDF; estado próprio no log; `error_code` separa não coube/demorou/fora do schema; teto medido | §D-29; §E.1 (SDK: `parse()` = `create().then(parseMessage)`, o parse lança antes de devolver `stop_reason`/`usage`; embrulhar o `parse` do formato devolve a mensagem inteira); §E.2 taxonomia; §C9 da varredura (`max_tokens` × saída de todos os `call_type`) |
| JORN-13 | Card nunca transforma ausência em 0 | §G; fontes medidas: `scores_bigfive` 0 linhas, `scores_disc` 0, `analise_ia_cultura` 0/38, `scores_raven` 1, `scores_candidato` `redacao` 2 |
| JORN-07 | Rubrica BARS do PRD enviada ao modelo; tela rotula pela mesma constante | §F.1 — constante única em `supabase/functions/_shared/` importável pelo front (precedente `exportacaoService.ts:61`); nenhum schema novo |
| JORN-25 | Encerrada não selecionável; EF recusa com mensagem verdadeira; banco trava; e-mail não sai; «Avançar» real; comparativo da decisão = `decisao_final` não encerrada; rótulo por `candidatura_id` | §H; ⚠ a trava quebra a fixture `p48_reabertura_smoke.sql:224-227` (Correção 19) |
| JORN-12 | Análise de entrevista com tipo, autor, hash, vínculo, vigente; falha nunca vigente; cache não cria linha; portão e revisão só a vigente; nova análise pós-revisão volta a aguardar | §I; 2 das 4 análises de `bf26ee3c` já são duplicatas de replay (Correção 9) |
| JORN-17 | `etapa_justificativa` limpa depois de consumida; 9 limpas com checkpoint | §J.1; 9 confirmadas, todas `md5` = último `criterio_texto` |
| JORN-3b | Leitura/UPDATE sem mudança não versiona; coluna nova não some em silêncio | §J.2 — `WHEN` por `to_jsonb` (cobre coluna nova por construção) + `stamp` idempotente |
| JORN-32 | IDOR no comparativo | §H.2 (`index.ts:182-220`) |
| JORN-33 | Kanban pelo predicado | §H.4; 3 linhas `finalizado` em etapa de trabalho em PROD |
| JORN-34 | Nenhuma tela reabre encerrada só por status | §H.5; ⚠ guarda de banco colide com o idioma de fixture de 8 smokes (Correção 20) |
| JORN-35 | SJT recebe rubrica e pesa pela chave | §F.2; `perguntas.rubric` só tem nomes+pesos; a única SJT avaliada devolveu 5 nomes, 0 casam |
| JORN-36 | Motor apaga o que o recibo promete | §K + Portão; ⚠ 9 das origens são `NOT NULL` e 4 têm `CHECK` que impede sentinela (Correção 14 — decisão do operador) |
| JORN-37 | Justificativa da decisão final não chega pela trilha | §J.3; **5** cópias em 4 candidaturas (Correção 11) |
| JORN-38 | Lista do RH sem `candidatos(*)` | §G.3; **3** ocorrências da forma, não 1 (Correção 21) |
| JORN-39 | Teto de custo e injeção registrados | §E.3 — `ALTER TYPE llm_provider ADD VALUE 'none'` (NULL quebraria o cron `ai-cost-aggregation`, Correção 32) |
| JORN-40 | Hub sem percentil cru | §G.4; o mesmo bloco mostra «Acertos X de 60» (mesma forma) |
</phase_requirements>

## Summary

A medição refeita em PROD confirma o esqueleto do CONTEXT e corrige **35 pontos**, sete dos quais mudam o
plano: (1) o D-48 como escrito («UPDATE, nenhuma linha apagada») **não é executável** para 5 origens do recibo
— `respostas_raven.resposta` e `respostas_bigfive.resposta` são `int NOT NULL` com `CHECK 1..8`/`1..5`,
`respostas_disc` é `NOT NULL` com `CHECK IN ('D','I','S','C')`, `respostas_formulario` tem `CHECK` «ao menos uma
não nula», `respostas_avaliacao.respostas`/`cognitivo_respostas.*` são `jsonb NOT NULL`: nenhuma sentinela cabe
nas duas primeiras — o operador tem de escolher entre apagar linha, relaxar a coluna ou mudar o recibo; (2) o
recibo tem **mais promessas falsas da mesma classe** do que o D-48 lista (o item `dados_enviados_a_analise_automatica`
promete apagar o conteúdo enviado, que é justamente `user_prompt_template`; as linhas `comparative_ranking` têm
`candidato_id` NULL e o motor nunca as alcança; citações literais sobrevivem em `redacoes_candidato.analise_ia` e
na `metadata` da SJT); (3) a trava do D-35 quebra a fixture de `p48_reabertura_smoke.sql` (não estava no D-56);
(4) uma guarda de banco para o JORN-34 quebra 8 smokes pelo idioma de fixture; (5) `interview_guide` também é
exposição viva — sua única chamada Sonnet desde 06/09 levou **98,4 s de 110 s**; (6) o
`unique_active_per_type` **é** imposto (é `EXCLUDE`, não índice), o que simplifica o JORN-07.

Para o D-29, com o throughput medido (pior caso em saída longa **45 tok/s**; mediana do `cv_job_match` ≈ 59 tok/s;
latência ≈ linear no nº de tokens, TTFT desprezível) e a razão real de **3,10 caracteres por token** (o truncamento
de 20/09 cortou em 3000 tokens na posição 9290), a proposta é **teto de 4 candidatos com `max_tokens = 3600`**
(3600 ÷ 45 = 80 s, 30 s de folga no timeout de 110 s; saída conservadora de 4 candidatos ≈ 3140 tok = 87 % do teto).
5 candidatos só cabem no modelo médio, sem folga no conservador.

O `_shared/ai-client.ts` é o ponto único do JORN-28/39: há um caminho de **baixo atrito** para detectar
truncamento sem trocar `messages.parse` por `messages.create` (e sem reescrever 7 arquivos de mock) —
embrulhar o `parse` do `output_config.format` para que nunca lance; o SDK então devolve a mensagem inteira com
`stop_reason` e `usage` (verificado no código do SDK 0.102.0).

**Primary recommendation:** levar ao operador as decisões do motor (Correção 14 e as origens a mais) e o teto
4/3600 **antes** do plano; planejar em 6 ondas com dono único por objeto compartilhado (`avancar_etapa` +
`registrar_decisao` + `responder_revisao_decisao` num plano só; `_shared/ai-client.ts` num plano só; o motor e o
checklist D-57 em sequência porque escrevem o mesmo gerador).

## Correções de fato

Cada linha foi medida nesta sessão. «Confirmado» significa que a medição bate com o CONTEXT/fila/ROADMAP.

| # | Item | O CONTEXT/fila dizia | Medido (evidência) | Consequência para o plano |
|---|---|---|---|---|
| 1 | Estado do git | `git log origin/main..HEAD` vazio | **2 commits** locais não enviados (`e9ac7959`, `f92fc810` — docs da 49) [VERIFIED: `git log --oneline origin/main..HEAD`] | Push antes do primeiro apply com efeito visível (D-52) |
| 2 | Causas dos fallbacks | timeout ×6, truncamento ×4, Zod ×5 | **timeout ×8** (cv_job_match 6, interview_guide 2), truncamento ×4 (cv 2, guide 1, comparative 1), Zod `too_big` ×5 (cv) = **17** (16 de 05–06/09 + 1 de 20/09) [VERIFIED: `ai_call_logs where provider='openai'`, `error_message`] | Taxonomia (§E.2) cobre os três; nenhuma nova |
| 3 | Comparativos por fallback | «06/09 e 20/09» | 06/09 (`b48c2adb`, 4 candidatos, 91,3 s) **não tem linha** em `ai_call_logs` (o INSERT falhava por 22P02 até o conserto do mesmo dia, `comparativo-candidatos/index.ts:261-263`); só o de 20/09 tem log [VERIFIED] | D-30 vale; a proveniência do de 06/09 é inferida, não medida — «desconhecida» é o valor certo |
| 4 | Exposição viva | «Só o `comparative_ranking` é exposição viva» | `interview_guide`: a única chamada Sonnet desde 06/09 (20/09 01:17) = 4436 tok em **98,4 s** (89 % do timeout); `max_tokens=8000` a 45 tok/s = 178 s — acima de ~4950 tok o timeout vem antes do teto [VERIFIED: `ai_call_logs`, `prompt_versions`] | Registrar no artefato D-50; depois do JORN-28 a falha passa a ser visível como `anthropic_timeout`. Mexer no guia é P1/fora — levar ao operador como risco |
| 5 | `unique_active_per_type` | «não é índice único; `maybeSingle` quebra com duas ativas» | É **`EXCLUDE USING btree (call_type WITH =) WHERE is_active AND NOT is_canary`**, não deferrable [VERIFIED: `pg_constraint`] — duas ativas não-canário são impossíveis. O risco real: o SELECT do canário (`prompt-loader.ts:175-179`) não filtra `is_active` e engole o erro do `maybeSingle` | Se houver versão nova: desativar a antiga **antes** de ativar a nova na mesma migration (constraint imediata) |
| 6 | Imutabilidade de `prompt_versions` | «texto novo = linha nova» | `prevent_published_prompt_edit` só protege `system_template`, `user_template`, `content_hash`, `semver`; **`max_tokens`, `temperature`, `model_id` mudam in-place** (precedente `20260906000003`) [VERIFIED: `pg_get_functiondef`] | D-29 é um `UPDATE prompt_versions SET max_tokens` com guarda de valor esperado, sem versão nova |
| 7 | Modelo de fallback | hardcoded (`ai-client.ts:61`) | Confirmado, e o parâmetro `fallback_model_id` que as 7 EFs passam (`resolvedPromptFromLoaded(…, "gpt-4o-mini")`) é **ignorado** por `runOpenAIFallback` (`:743`) [VERIFIED] | Contrato morto; P1 fora — só não confiar nele para a proveniência (gravar `response.model`) |
| 8 | Flag de cache | — | `CallAiResult.cache_hit` é `true` para replay **e** para prompt-cache (`cachedTokens > 0`, `ai-client.ts:685`) [VERIFIED] | O D-40 não pode usar `cache_hit`; exige flag própria (`replayed`) ou checagem de hash antes da chamada |
| 9 | Análises de entrevista | 6 análises, 3 candidaturas | Confirmado. E **2 das 4 de `bf26ee3c`** (01:52:54, 01:53:12) são replays do texto A (competências/citações idênticas às de 01:37:30), sem chamada de IA; 0 linhas de falha (competências nulas) hoje; `a1dd4c42` foi gerada pelo prompt `0.0.0` (stub de junho) [VERIFIED] | D-43: hash/vínculo reconstruíveis para **5 de 6** (links `10dc2cc2…` texto A, `040c9060…` texto B, `9633ec2f…` para `0b1c887b`); `a1dd4c42` fica nula |
| 10 | Tipo das análises existentes | — | Nenhuma das 6 tem como saber online/presencial | D-43 grava `tipo` nulo; a regra de vigente precisa tratar o grupo «tipo nulo» como um grupo próprio (Open Q) |
| 11 | Cópias BD-9 no histórico | 4 cópias (3 teste, 1 real `d31c78bb`) | **5 linhas** em **4 candidaturas**: `0b1c887b`, `2ce20fbf` ×2 (uma casa uma justificativa **arquivada**, 00:21:34), `6e5d8051`, `d31c78bb` [VERIFIED: `criterio_texto = decisao_final.justificativa OR = decisao_final_historico.justificativa`] | O checkpoint do D-47 conta 5, não 4; a consulta tem de casar também o arquivo |
| 12 | Snapshots | 11 / 3 candidaturas / 5 sem mudança | Confirmado; mais **1** que só mudou carimbo de leitura (`2ce20fbf`, 00:22:13) — o D-44 teria suprimido 6 de 11 [VERIFIED] | Critério da prova: «recarregar N vezes → 0 snapshot» |
| 13 | Origens a mais no D-48 | a lista do D-48 | Além das colunas listadas: (a) linhas `comparative_ranking` (`candidato_id` NULL por desenho) carregam `resumo_cv` + `candidatura_id` de até 10 titulares em `user_prompt_template` e o ranking sobre eles em `raw_response` — o motor (`WHERE l.candidato_id = p_candidato_id`, vivo L555-559) nunca as alcança; (b) `redacoes_candidato.analise_ia.dimension_scores[].cited_evidence` e `scores_candidato.metadata.dimension_scores[].cited_evidence` (SJT) guardam **trechos literais** do que o titular escreveu [VERIFIED] | Decisão do operador: entram no passo novo (recomendado) ou o recibo ressalva |
| 14 | D-48 × esquema | «UPDATE; nenhuma escrita apaga linha» | 9 alvos `NOT NULL`: `ai_call_logs.user_prompt_template`, `redacoes_candidato.texto`, `respostas_cultura.resposta_texto`, `respostas_bigfive.resposta` (int, `CHECK 1..5`), `respostas_raven.resposta` (int, `CHECK 1..8`), `respostas_disc.mais_/menos_caracteristico` (`CHECK IN ('D','I','S','C')` e `<>` entre si), `respostas_avaliacao.respostas`, `cognitivo_respostas.raw_responses`/`proctoring`, `devolutivas_candidato.conteudo_jsonb`; `respostas_formulario` tem `CHECK (resposta_texto IS NOT NULL OR resposta_opcoes IS NOT NULL OR resposta_numerica IS NOT NULL)` [VERIFIED: `information_schema.columns`, `pg_constraint`]. Linhas hoje: `respostas_raven` 60, `respostas_formulario` 109, `respostas_avaliacao` 9, demais 0 | **Inexequível como escrito para inteiros/enum** (D-14): ver Portão, decisão nova A |
| 15 | Devolutiva | o motor não toca `devolutivas_candidato` | A linha **é apagada hoje**: FK `devolutivas_candidato_candidato_id_fkey → auth.users ON DELETE CASCADE`, disparada pelo passo 3 (`auth_delete_user`) [VERIFIED: `pg_constraint confdeltype='c'`] | A frase do recibo sobre a devolutiva já é verdade; o passo novo não precisa dela |
| 16 | Segunda promessa falsa | só `respostas_e_producoes` | `dados_enviados_a_analise_automatica` («o conteúdo enviado para as análises automáticas… foram apagados», `gen-recibo-exclusao.cjs:344-356`) só lista `raw_response`/`parsed_reasoning`; o conteúdo enviado (`user_prompt_template`) está mapeado como **`conteudo_do_produto`** (`recibo-exclusao.json:500`; `gen-recibo-exclusao.cjs:650`) [VERIFIED] | O Portão item 4 também é do recibo, não só do inventário |
| 17 | Tabelas «sem PII do titular» | — | O recibo lista `analise_candidato_vaga` e `entrevista_guias` em `tabelas_sem_pii_titular`; medido: 13/24 análises e 2/5 guias contêm o primeiro nome do titular [VERIFIED: contagem por `position(primeiro_nome in …)`, sem imprimir conteúdo] | As duas ganham coluna (D-28) → o checklist D-57 vai esbarrar nessa classificação. Decisão do operador (Open Q 3) |
| 18 | Guarda de revisão da redação | — | `trg_redacao_rh_only_review_fields` (BEFORE UPDATE) **recusa** mudar `texto`/`analise_ia`/`model_version`/`input_hash`… quando o JWT tem papel `rh`/`administrador` [VERIFIED] | O passo novo do motor não pode depender do papel do chamador; hoje o motor I roda com o JWT do titular e o II como serviço (passa), mas uma execução por admin abortaria **depois** do Storage |
| 19 | Smokes que a trava D-35 toca | `oper31:162-183` | Também **`p48_reabertura_smoke.sql:224-227`**: a fixture move F4 de `rejeitado/rejeitado` para `decisao_final/em_analise` por UPDATE cru — a trava recusa [VERIFIED: leitura] | O plano da trilha ajusta a fixture (entra pela GUC sancionada) e prova que o smoke ainda morde |
| 20 | JORN-34 no banco | — | 8 smokes usam o idioma «INSERT `status='rejeitado'` (desarma o dispatch) + UPDATE `status='em_analise'`» (`p48_dedupe:187` e `p45_motor:880` lidos; demais pelo `grep`) [VERIFIED/grep] | Guarda que recuse «sair de `rejeitado`» por status quebra todos; ver §H.5 (escopo por `auth.uid()`) |
| 21 | `candidatos(*)` | 1 (`listAllCandidaturas`) | **3**: `candidaturasService.ts:434` (`updateCandidaturaStatus`), `:562` (`listAllCandidaturas`), e `listCandidaturasByVaga` pede `cpf` e `data_nascimento` explicitamente (`:689-697`) [VERIFIED] | JORN-38 cobre os três; o card usa só `id, nome_completo, email, celular` |
| 22 | Kanban | ignora `finalizado` no selo | Confirmado, e o mesmo `!terminalBadge` libera **o menu inteiro** (Avançar/Retroceder/Rejeitar, `KanbanBoard.tsx:298-316`); 3 linhas em PROD (`triagem/finalizado`, `entrevista_online/finalizado`, `decisao_final/finalizado`) [VERIFIED] | Selo pelo predicado; a trava D-35 é a segunda camada |
| 23 | D-36b | — | População `etapa_atual='decisao_final'` e não encerrada = **1** candidatura em todo PROD (`a1dd4c42`) [VERIFIED] | Com D-36b o comparativo da decisão fica indisponível (< 2) em todas as vagas hoje; a tela precisa de estado vazio verdadeiro |
| 24 | Card: Inteligência | «faixa do Raven, sem percentil» | O card **já** mostra faixa (`cognitivoBanda`, `ScoreCard.tsx:23-27`) mas colore pelo percentil; há **dois vocabulários** de faixa: `scores_raven.classificacao` («Inferior») e o de 3 faixas provisórias do `cognitivoBanda` [VERIFIED] | D-33 precisa dizer qual faixa (Open Q 4) |
| 25 | Comentário de `essay-schemas.ts` | `:19-20,43` | `:19-20` é falso (4 valores); `:43` já lista `especificidade/acao/aprendizado/alinhamento_valores` = PRD [VERIFIED] | Só o `:19-20` sai |
| 26 | SJT | pesos por nome viram uniformes | Confirmado: `perguntas.rubric` = `{banda:{avanca:18,score_max:25,entrevista:13}, dimensoes:[{dimension,peso}×5]}` sem âncoras; a única SJT avaliada por IA (`a1dd4c42`, 2026-06-26) devolveu 5 nomes inventados, 0 casam; `work_sample_sjt` tem **0** linhas em `ai_call_logs` [VERIFIED] | Injetar nomes+pesos por chave; âncoras vêm do PRD-sjt (constante), não do banco |
| 27 | IDOR | `index.ts:180-213` | Posse em `:182-194`, leitura `:198-201`, checagem de «mesma vaga» `:210-220` — nunca compara com `body.vaga_id` [VERIFIED] | Confirmado |
| 28 | Escopo do BD-9 | — | Justificativas de **etapa** (rejeição na triagem, regressão) chegam ao titular **por decisão já tomada** (§7.22, `avisoJustificativa.ts:1-30`, aviso visível na tela); só a da decisão final é BD-9 [VERIFIED] | O D-47 não se estende a `rejeitar_candidatura`; os 3 textos de triagem no histórico são escopo deliberado |
| 29 | SJT sem proveniência | lista do D-28 | `scores_candidato` tipo `sjt` também é resultado de IA sem modelo (EF `avaliar-redacao`) [VERIFIED] | Operador decide se entra (cabe na `metadata`, sem coluna nova nem checklist) |
| 30 | `stamp` idempotente | «`WHERE explicacao_solicitada_em IS NULL`» | Com o filtro, o `RETURNING * INTO v_row` sai vazio na 2ª chamada e a função devolve NULL [VERIFIED: L21-26] | Re-SELECT depois do UPDATE (idioma de `solicitar_revisao_decisao` L30-37) |
| 31 | GUC de sanção | — | `app.rejeicao_sancionada` usa `set_config(…, true)`: vale até o **fim da transação**. Num smoke (`p46apply run` = 1 transação) vaza para todo UPDATE seguinte [VERIFIED] | Toda GUC nova (D-35) é resetada logo após o UPDATE que ela sanciona |
| 32 | `provider` nulo (JORN-39) | «valor válido no enum ou `provider` nulo» | `ai_cost_daily.provider` é `llm_provider NOT NULL` e o cron `ai-cost-aggregation` agrupa por `provider` [VERIFIED: `cron.job`] — uma linha nula de log derruba a agregação do dia inteiro | Recomendado: `ALTER TYPE llm_provider ADD VALUE 'none'` |
| 33 | EFs consumidoras | 7 | Confirmado: `analise-candidato-individual` (v29, jwt off), `avaliar-redacao` (v19), `avaliar-redacao-cultural` (v14), `avaliar-transcricao-entrevista` (v15), `comparativo-candidatos` (v27), `gerar-guia-entrevista` (v17) — estas 5 com `verify_jwt=true`, deploy de 2026-09-06 — e `gerar-devolutiva-bigfive` (v27, jwt off, 2026-09-22) [VERIFIED: Management API `GET /functions`] | Um deploy por EF, `verify_jwt` preservado; o `_shared` mudou desde 06/09 só em `email-*`, `exportAllowlist`, `reciboExclusao` (fora do fechamento das 5) — conferir com `--dry-run` |
| 34 | Baselines | tsc 90; varredura 282 | Confirmado: `npm run lint` = **90** erros; varredura = **282**; listas declaradas 36; `<> (CASE` 3; vitest **205 arquivos / 2068 testes** verdes; Deno (29 arquivos das EFs tocadas, sem `strict-schema.test.ts`) **411/0** [VERIFIED] | Portões numéricos da fase |
| 35 | 9 justificativas grudadas | 8 teste, 1 real | Confirmado: 5 `+claude`, 1 fixture, **2 do titular já anonimizado** (`invalido.local`, a exclusão de 22/08), 1 real (`d31c78bb`, 5 caracteres) [VERIFIED: domínio do e-mail, sem imprimir endereço] | Limpar as 2 do tombstone não perde nada (o texto está no histórico), mas é linha de titular excluído: registrar no checkpoint |

Confirmados sem divergência (evidência na seção indicada): `avancar_etapa` L11-13/L17-20/L24-37/L40-47 (§J.1);
`registrar_decisao` escreve `etapa_justificativa` em L122 e L132 (§J.3); `ai-client.ts:742-749` ignora
`max_tokens`/`temperature` (§E.1); `ai-client.ts:137-153` e `:629-637` nunca enviam `user_template` (§F.1);
`audit-logger.ts:179-185` engole o erro (§E.3); `notificar-candidato/index.ts:288-298` só guarda `confirmacao`
(§H.3); `entrevistaService.ts:405-410` / `:457-488` (§I); `CandidatosRHPage.tsx:352-355` (§G);
`enum llm_provider = {anthropic,openai,google}`; 38 candidaturas / 44 candidatos; `entrevista_analises` sem
`tipo`/autor/hash/vigente.

## D-29 — teto de candidatos do comparativo (proposta)

**Proposta: teto = 4 candidatos, `max_tokens = 3600`.** Reversibilidade: **reversível** (um `UPDATE` em
`prompt_versions` + uma constante; o fingerprint de idempotência inclui `max_tokens`, então replays antigos
não voltam).

### Medições (PROD, `ai_call_logs`, só leitura)

| Medida | Valor | Evidência |
|---|---|---|
| Throughput Sonnet, `cv_job_match` (25 chamadas, 2017–3256 tok) | 46,4–65,8 tok/s, mediana ≈ 59 | `output_token_count*1000/latency_ms` |
| Throughput em saída longa, pior caso | **45,1 tok/s** (`interview_guide`, 4436 tok / 98,4 s); 44,6–47,2 (`culture_fit_essay`) | idem |
| TTFT | desprezível: ajuste linear do `cv_job_match` dá 17,0 ms/token e intercepto ≈ 0 s | (53 641 − 32 533) / (3256 − 2017) |
| Caracteres por token (JSON pt-BR do comparativo) | **3,10** | truncou em `max_tokens=3000` na posição 9290 |
| Saída Sonnet por candidato (junho, n=2, 4 saídas) | ≈ 855–870 caracteres ≈ **280 tok** | `comparativo_solicitado.ranking.ranked_candidates` |
| Parte fixa (junho) | ≈ 2360 caracteres ≈ 760 tok | `reasoning`+`recommendation`+`ties_or_concerns`+`bias_audit` |
| Parte fixa hoje (schema de 06/09: `reasoning` «até ~3000 caracteres») | ≈ 3900 caracteres ≈ **1260 tok** | `analise-schemas.ts:142` |
| Prova de 20/09 | n=6 passou de 3000 tok ⇒ `F + 6P > 3000` ⇒ P > 290 com F=1260 | log truncado |

### Conta

- **Teto de tempo:** 110 s por tentativa, 1 tentativa. Geração ≤ 80 s no pior throughput (27 % / 30 s de folga
  para DB, TTFT e variância): 80 s × 45 tok/s = **3600 tok ⇒ `max_tokens = 3600`**. Na mediana (59 tok/s) são 61 s.
- **Modelo conservador** (P = 410 tok: `rationale` ~400 car. + 3+3 itens de ~120 car. + JSON ≈ 1270 car. ÷ 3,1;
  F = 1500 tok): n=4 → 1500 + 1640 = **3140 tok (87 % do teto)**; n=5 → 3550 (99 %, sem folga).
- **Modelo médio** (P = 330, F = 1300): n=5 → 2950 (82 %); n=6 → 3280 (91 %).
- **Maior n com folga no conservador = 4.** 5 só com o modelo médio; 6 nunca com folga.

Uso real em PROD: n = 2, 2, 4, 6. Com teto 4 o caso de 20/09 (6) passa a ser recusado **antes** da chamada, com
mensagem verdadeira.

**O que muda no código (8 lugares, uma constante):** `comparativo-candidatos/index.ts:169,172`;
`ComparativeRankingSchema.ranked_candidates.max(10)` (`analise-schemas.ts:156` — baixar para o teto muda o JSON
Schema ⇒ fingerprint novo, correto); `TriagemTable.tsx:214` (`COMPARE_MAX`), `:267`, `:425`;
`ComparativoCandidatosPage.tsx:102`; `DecisaoFinalPage.tsx:123,201`; `__tests__/index.test.ts:212`.
Recomendado: `COMPARATIVO_MAX_CANDIDATOS` exportado de um `_shared` sem imports, importado pelo front
(precedente: `src/features/privacidade/services/exportacaoService.ts:61` importa de `supabase/functions/_shared/`).

**Prova no plano:** um comparativo de 4 candidatos de teste depois do deploy; critério: `ai_call_logs` da chamada
com `provider='anthropic'`, `output_token_count ≤ 3600`, `latency_ms ≤ 90000`. Se passar de 3140 tok, o teto
volta ao operador antes de fechar a fase.

## Portão antes do plano — o que volta ao operador

- **Item 1 — Correções de fato:** §«Correções de fato» acima (35; as que mudam plano: 4, 5, 13, 14, 16, 19, 20).
- **Item 2 — D-29:** §«D-29» acima (4 / 3600).

### Item 3 — `revisao_resultado` no motor de exclusão

**Fatos.**
- `anonimizar_candidato` (vivo, 731 linhas): passo `tombstone_decisao_final` troca **só** `justificativa` —
  L524-527 em `decisao_final` e L537-540 em `decisao_final_historico`, nesta ordem (o UPDATE da corrente dispara o
  snapshot de OLD, e só depois o arquivo é raspado). `revisao_resultado` não aparece. [VERIFIED]
- O que é: o texto de ≥ 50 caracteres do **revisor** respondendo ao pedido de revisão do titular
  (`responder_revisao_decisao` L86); o candidato o lê (`explicacaoService` projeta a coluna) e ele **entra na cópia**
  (`exportAllowlist.ts:515,554`; `export-scope-rules.yaml:805`). Como a justificativa, pode citar dado pessoal.
- Linhas: 1 em `decisao_final` (`6e5d8051`, `+claude`, `mantida`, 347 car.) e 1 em `decisao_final_historico`
  (`revertida`, 60 car.). Ambas de teste. [VERIFIED]
- Recibo: está em `anotacoes_da_equipe` («ficam guardadas **sem ligação** com você», `gen-recibo-exclusao.cjs:537,540`)
  — mas o texto fica literal, enquanto a `justificativa` vira sentinela. O inventário já anota
  «⚠ anonimizar_candidato não a toca» (`pii-inventory.yaml:183`).

**Recomendação: entra junto no D-48.** São dois `SET revisao_resultado = '<sentinela>'` **dentro dos mesmos dois
UPDATEs** do passo `tombstone_decisao_final` (a ordem snapshot→scrub vem de graça), a linha correspondente no
`plano_exclusao_titular`, e o item do recibo passa de «fica sem ligação» para o mesmo tratamento da justificativa.
Custo marginal: nenhum portão novo (o do D-48 já existe), uma asserção a mais no `p45_motor_exclusao_smoke.sql`.
Reversibilidade: **one-way por execução** (como todo o passo); o código é reversível.

### Item 4 — janela de exposição de `ai_call_logs.user_prompt_template`

**Fatos.**
- 54 linhas; 52 com `candidato_id`; **todas** de contas de teste (`+claude`/fixture) [VERIFIED].
- Por `call_type`: `cv_job_match` 38 (1192–3783 car.; **34/38 contêm o primeiro nome** do titular; 35 têm
  placeholder de máscara), `transcript_analysis` 3 (**3/3 com o primeiro nome**; fala literal), `culture_fit_essay` 2,
  `interview_guide` 4, `bigfive_devolutiva` 5, `comparative_ranking` 1 (**14 721 car., `candidato_id` NULL, input de 6
  titulares com `candidatura_id`**), `cv_summary` 1 [VERIFIED: contagem, sem imprimir conteúdo].
- `maskPII` tira só CNPJ, CPF, e-mail, data de nascimento, telefone, endereço com logradouro, RG
  (`pii-masker.ts:36-54`); nomes e fala passam.
- Acesso: RLS com uma policy só (`administrador_le_ai_call_logs`, SELECT); `SET LOCAL ROLE anon` e `authenticated`
  sem JWT leem **0** linhas; nenhuma view sobre a tabela [VERIFIED].
- Retenção: `retain_until = created_at + 180 d` (`audit-logger.ts:103-106`; o ramo de 5 anos para
  `recommendation='advance'` nunca é alcançado — `callAi` não passa `recommendation` nas linhas normais); purga
  diária `ai-logs-retention-cleanup` (02:00), que poupa linhas referenciadas por `candidate_ai_decisions` em revisão
  (1 linha na tabela) [VERIFIED: `cron.job`]. `matriz-retencao.yaml` **não tem** entrada para `ai_call_logs`.
- Classificações hoje: `pii-inventory.yaml:330` `user_prompt_template: { classificacao: preservar }` (natureza da
  tabela: «0 linhas em 2026-07-29»); a nota de `raw_response` (`:331`) diz «contém o payload enviado à LLM» — o
  payload enviado é o `user_prompt_template`; o `raw_response` é a **saída**. Recibo: `conteudo_do_produto`
  (`recibo-exclusao.json:500`).

**Recomendação.** Reclassificar nos três artefatos, no mesmo plano do motor:

```yaml
# pii-inventory.yaml — ai_call_logs
user_prompt_template: { classificacao: apagar, regra: R5, tipo: text, nota: "Input MASCARADO enviado ao modelo: currículo, respostas, redação e a transcrição da entrevista. maskPII remove só identificadores estruturados (CPF, e-mail, telefone, data, endereço, RG, CNPJ) — nomes e fala ficam literais (medido 2026-09-22: 3/3 transcript_analysis e 34/38 cv_job_match com o primeiro nome do titular). Janela: 180 d (retain_until + cron ai-logs-retention-cleanup); só administrador lê (RLS). Desde a Phase 49 (D-38) é a fonte da análise de entrevista, por hash + vínculo. Linhas comparative_ranking têm candidato_id NULL e carregam o input de vários titulares." }
raw_response:         { classificacao: apagar, regra: R5, nota: "SAÍDA do modelo sobre a pessoa (o input enviado é user_prompt_template)" }
```

e, no recibo, `ai_call_logs.user_prompt_template` sai de `conteudo_do_produto` e entra como origem de
`dados_enviados_a_analise_automatica` — que é exatamente o que esse item já promete. Reversibilidade: reversível
(texto de inventário); o comportamento que ele descreve (o motor apagar) é one-way por execução.

### Decisões novas que a medição criou (não estavam no CONTEXT)

**A. Respostas que não aceitam sentinela (Correção 14).** Para `respostas_raven.resposta` (int 1–8),
`respostas_bigfive.resposta` (int 1–5), `respostas_disc.*` (D/I/S/C) e `respostas_formulario` (CHECK «ao menos uma»):

| Opção | O que faz | Reversibilidade |
|---|---|---|
| (a) Apagar as **linhas** dessas tabelas no passo novo | O recibo fica verdadeiro ao pé da letra; os scores já calculados (`scores_raven`, `scores_candidato`) ficam | **one-way**; exige a decisão explícita que o D-54 pede |
| (b) Migration que relaxa (`DROP NOT NULL` + `CHECK … OR resposta IS NULL`) e o passo põe NULL | Nenhuma linha some; colunas passam a aceitar nulo para sempre | costly (esquema de 4 tabelas; os leitores precisam tolerar nulo) |
| (c) Recibo ressalva as respostas de múltipla escolha («as alternativas que você marcou ficam, sem ligação com você») | Nenhuma mudança de esquema; texto do recibo muda | reversível |

**Recomendação: (a)** para as quatro tabelas de múltipla escolha — é a única que torna verdade o que o
operador escolheu no D-48 («o motor passa a apagar») sem mudar esquema, e elas não são prova de
não-discriminação (os scores ficam). Texto/jsonb recebem sentinela. **É `checkpoint:decision`.**

**B. Linhas `comparative_ranking` no log (Correção 13a).** Recomendação: o passo novo, para cada candidatura do
titular, redige `user_prompt_template` **e** `raw_response` inteiros das linhas `call_type='comparative_ranking'`
cujo `user_prompt_template` contém `id=<candidatura_id>` (o formato vem de `comparativo-candidatos/index.ts:233`).
Isso também apaga o input dos outros titulares daquela linha — é log de telemetria, o resultado continua em
`comparativo_solicitado`. Alternativa: cortar só o bloco do titular (frágil, depende do formato do texto).
**`checkpoint:decision`**.

## Project Constraints (from CLAUDE.md)

- Migrations **só** por `node p46apply.cjs migrate` (SQL lido do arquivo, ledger na mesma requisição, md5 conferido); nunca SQL Editor nem `apply_migration` do MCP; sem `BEGIN/COMMIT` externo.
- EFs por `node efdeploy.cjs <slug>` com `--dry-run` antes (o cabeçalho afirma uma checagem de fechamento que não existe — deferred 48-19). Preservar `verify_jwt` de cada EF (Correção 33).
- Depois de todo apply com efeito visível: `git log --oneline origin/main..HEAD` vazio (hoje **não está**, Correção 1). Marcador no ar: procurar no chunk certo (`/rh/*`, `/admin/*` são lazy): `grep -rl "<marcador>" build/assets/`.
- Portões: varrer pela forma antes de acrescentar objeto vigiado ou mudar comportamento asserido; conserto de fotografia = baseline da própria execução (`to_jsonb`); provar que o portão ainda morde.
- `database.types.ts` só pelo CLI e **com `< /dev/null`** (`npm run db:types < /dev/null`; sem isso pendura e trunca a zero octeto). Nunca editar à mão.
- Nunca `service_role` no client; escrita privilegiada por RPC SECURITY DEFINER ou EF; RLS em 100 % das tabelas com dado de usuário; exposição a `anon` inclui views (medir com `SET LOCAL ROLE anon`).
- Linguagem: «avaliação comportamental/cognitiva», nunca «teste psicológico» (exceção decidida: o disclaimer negado da devolutiva); o sistema nunca rejeita por score (RNF-07a); todo texto novo passa por `forbidden-strings.grep.test.ts`; nenhuma ocorrência literal nova do canal de privacidade (D-07).
- Convenções: componentes PascalCase com export nomeado; hooks `useX`; services `xService.ts` com classes de erro; Zod pt-BR; query keys hierárquicas; domínio pt-BR, código técnico em en.
- `tsc` ≤ 90 (medido: 90).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Trava de encerrada no avanço (D-35) | Database (`avancar_etapa` BEFORE UPDATE OF `etapa_atual`) | EF (`notificar-candidato` recusa `avanco`) + Browser (selo/seleção) | toda escrita de etapa passa pelo trigger; o e-mail é assíncrono e só a EF vê o estado pós-COMMIT |
| Trava de reabrir por status (JORN-34) | Browser (tirar a transição) | Database (guarda de status escopada ao cliente) | o caminho auditado de reabrir é `responder_revisao_decisao`; ver §H.5 |
| Limpeza de `etapa_justificativa` (JORN-17) | Database (mesma função BEFORE, depois do INSERT) | — | portão e cópia já estão juntos ali |
| Snapshot só com mudança (JORN-3b) | Database (`WHEN` do trigger) | Database (`stamp` idempotente) | o `WHEN` cobre coluna nova por construção |
| Detecção de truncamento/timeout/schema (JORN-28) | Edge Function (`_shared/ai-client.ts`) | Database (`ai_call_logs.error_code`) | só o cliente do SDK vê `stop_reason`/`usage` |
| Proveniência real (D-28) | Edge Function (grava `provedor_ia`/`modelo_ia` do `CallAiResult`) | Database (colunas) | o modelo real só existe na resposta do provedor |
| Rubrica da redação (JORN-07) | Edge Function (bloco injetado a partir de constante) | Browser (rótulos da **mesma** constante) | constante única em `_shared/`, importável pelo front |
| Vigente da análise (JORN-12) | Database (coluna + regra) | EF (escreve hash/vínculo/tipo) + Browser (mostra vigente e superadas) | portão e revisão (SQL) leem a mesma marca |
| Teto do comparativo (D-29) | Edge Function (recusa) + Database (`prompt_versions.max_tokens`) | Browser (seleção) | constante única |
| IDOR do comparativo (JORN-32) | Edge Function | — | lê por `service_role`; a posse é dela |
| Card do RH (JORN-13/38/40) | Browser | Database (fonte `scores_candidato`) | leitura; RLS já filtra |
| Motor de exclusão (JORN-36) | Database (`anonimizar_candidato` + `plano_exclusao_titular`) | EF (`executar-direito-titular` passo 2) + docs (recibo gerado) | mecanismo destrutivo, transação única |

## Standard Stack

Nenhuma biblioteca nova. Tudo já está no repositório e em PROD.

### Core (já instalado)
| Library | Version | Purpose | Onde |
|---------|---------|---------|------|
| `@anthropic-ai/sdk` (EF) | 0.102.0 | `messages.parse` com `output_config.format` | pin em cada EF; fonte lida em `~/Library/Caches/deno/npm/registry.npmjs.org/@anthropic-ai/sdk/0.102.0/` [VERIFIED] |
| `openai` (EF) | 6.42.0 | fallback `chat.completions.parse` | idem; aceita `max_completion_tokens` e `temperature` (`completions.d.ts:1625,1807`) [VERIFIED] |
| `zod` (EF) | 3.25.76 (entrada `/v4` nos schemas de saída) | structured output | `analise-schemas.ts:27` |
| Deno | 2.9.4 | `deno test` | local [VERIFIED] |
| Supabase CLI | 2.116.0 | `db:types` | local [VERIFIED] |
| PostgreSQL | 17.6 | PROD | [VERIFIED: `version()`] — `ALTER TYPE … ADD VALUE` é permitido dentro da transação do `p46apply` (o valor novo só não pode ser **usado** na mesma transação) [CITED: postgresql.org/docs/17/sql-altertype.html] |
| Vitest / RTL | do `package.json` | front | 205 arquivos / 2068 testes verdes [VERIFIED] |

## Package Legitimacy Audit

Nenhum pacote novo é instalado nesta fase. Não se aplica.

**Packages removed due to [SLOP] verdict:** none · **Packages flagged as suspicious [SUS]:** none

## E. JORN-28 e JORN-39 — `_shared/ai-client.ts` (dono único)

### E.1 Estado vivo, linha a linha (`supabase/functions/_shared/ai-client.ts`, 806 linhas)

- `:61` `OPENAI_FALLBACK_MODEL = "gpt-4o-mini"`; `:63` retry só 429/503/529; `:288-302` `isRetryable` (status, `APIConnectionTimeoutError`, regex) — parse/schema **não** é retryable.
- `:119-129` `ResolvedPrompt` **sem** `user_template`; `:137-153` `resolvedPromptFromLoaded` não o copia.
- `:376-415` `tryIdempotencyReplay` — seleciona `provider, cost_usd, latency_ms, success, raw_response, error_code` (sem `model_id`, sem `id`); replaya qualquer `success=true`, **inclusive fallback**.
- `:439-473` AI-06 soma `cost_usd` de `success=true` do dia UTC; `:536-570` e `:573-608` escrevem `provider: "none"` → 22P02 no enum, engolido.
- `:614-621` breaker aberto → fallback `anthropic_circuit_open`.
- `:626-697` loop: `messages.parse(...)` (`:629-649`); sucesso loga 1 linha (`:658-678`); catch: `recordFailure()` para **qualquer** erro (`:690`), retry só se retryable; senão `break`.
- `:731-806` `runOpenAIFallback`: `:742-749` sem `max_tokens`/`max_completion_tokens` e sem `temperature` (a API usa o default dela [ASSUMED: temperature=1]); `:773-795` **uma** linha `provider:'openai'`, `success: parsed !== null`, `error_code: anthropic_retries_exhausted|anthropic_circuit_open`, `error_message` = mensagem da Anthropic. A tentativa Anthropic (cobrada: 3000 tok × US$15/M + 4445 × US$3/M ≈ US$0,058 em 20/09) não vira linha.
- `audit-logger.ts:128-186` `logAiCall` devolve `void`; `:171-178` upsert por `idempotency_key` (1 linha por chave); `:179-185` engole o erro.

**Como o SDK 0.102.0 se comporta no truncamento** [VERIFIED: fonte do pacote]:
`messages.js:61-62` `parse(params, options) { return this.create(params, options).then((message) => parseMessage(message, params, …)) }`;
`lib/parser.js:51-64` chama `outputFormat.parse(content)` dentro de `try` e relança como
`AnthropicError("Failed to parse structured output: …")`; `helpers/zod.js` monta `parse` que lança «as JSON» para
JSON cortado e lista de issues para Zod. Não há checagem de `stop_reason` em lugar nenhum. `StopReason =
'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use' | 'pause_turn' | 'refusal'` (`messages.d.ts:1004`).
No OpenAI 6.42.0, `finish_reason === 'length'` lança `LengthFinishReasonError` (`lib/parser.js:96-97`).

### E.2 Desenho recomendado

1. **Detecção sem trocar `parse` por `create`:** em `callAi`, embrulhar o formato:
   `const fmt = zodOutputFormat(schema, call_type); const fmtSeguro = { ...fmt, parse: (c) => { try { return fmt.parse(c) } catch (e) { return { [FALHA_PARSE]: e } } } }`.
   O SDK então resolve com a mensagem inteira: `stop_reason === 'max_tokens'` ⇒ **não coube**;
   `parsed_output[FALHA_PARSE]` com `stop_reason === 'end_turn'` ⇒ **fora do schema**; `'refusal'` ⇒ recusa;
   `usage` disponível em todos para custear a tentativa. Timeout segue pelo `APIConnectionTimeoutError`.
   Vantagem: os 7 arquivos de teste que mockam `messages.parse` continuam válidos (os mocks só ganham `stop_reason`
   onde o teste precisa). `JSON.stringify` do fingerprint ignora a função, então a chave não muda.
2. **Taxonomia** (strings em inglês, como as existentes; ninguém no `src/` lê o valor — só comentários):
   `anthropic_max_tokens` · `anthropic_timeout` · `anthropic_schema_invalid` · `anthropic_refusal` ·
   `anthropic_overloaded` (429/503/529 esgotado) · `anthropic_api_error` (demais) · `anthropic_circuit_open`.
   As 17 linhas antigas ficam com `anthropic_retries_exhausted` (sem escrita retroativa).
3. **Duas linhas por fallback.** (i) a tentativa Anthropic: `provider='anthropic'`, `success=false`, `error_code`
   da causa, `output_token_count`/`cost_usd` do `usage` quando houver, **`idempotency_key` NULL** (senão o upsert
   por chave a sobrescreve com a linha do fallback); (ii) a linha do resultado: `provider='openai'`,
   `model_id=response.model`, `success=true`, `error_code='fallback_' || causa` (ex.: `fallback_anthropic_max_tokens`).
   O `AiLogsPage` passa a mostrar «Fallback» (âmbar) quando `error_code LIKE 'fallback_%'`, não «Sucesso».
4. **`success`** = «o resultado é utilizável». Efeitos: `ai_cost_daily.error_count` passa a contar a tentativa
   falha (verdade); AI-06: **tirar o filtro `success=true`** da soma — dinheiro gasto em tentativa falha também é
   gasto. Reversível.
5. **Replay honesto:** não replayar linha de fallback (`existing.error_code LIKE 'fallback_%' → null`): o clique
   seguinte tenta o Sonnet de novo. E o replay passa a devolver `id` e `model_id` (a EF grava a proveniência do
   resultado replayado). Flag nova `replayed` (≠ `cache_hit`, Correção 8).
6. **Fallback respeita o prompt:** `max_completion_tokens: prompt.max_tokens`, `temperature: prompt.temperature`.
   `LengthFinishReasonError` do fallback vira linha `openai`/`success=false`/`openai_max_tokens` antes do throw.
7. **Breaker:** `recordFailure()` só para timeout/overloaded/api_error; truncamento, schema e recusa são
   determinísticos por input e não medem a saúde do provedor.
8. **`CallAiResult`** ganha `model` (real: `response.model` / linha do replay), `log_id` (para o D-38),
   `replayed`, e `fallback_cause`.

### E.3 JORN-39

`ALTER TYPE public.llm_provider ADD VALUE IF NOT EXISTS 'none';` (migration aditiva, onda 1) + `audit-logger`
deixa de engolir: devolve `{ id, error }` e o chamador de linha `none` (teto de custo/injeção) registra o erro em
`recruiter_alerts` (precedente `emitPromptStubAlert`, `audit-logger.ts:209-235`) — **nunca** lança no caminho da EF.
`NULL` em `provider` foi descartado: `ai_cost_daily.provider` é `NOT NULL` e o cron agrupa por ele (Correção 32).
Consumidores do enum no front: `aiLogsService.ts:17`, `aiCostsService.ts:15` (tipo gerado — `db:types` resolve).

## F. JORN-07 e JORN-35 — rubrica enviada, rótulo pela chave

### F.1 Redação cultural (D-24..D-26)

- **Onde a rubrica mora (recomendado):** `supabase/functions/_shared/bars-redacao.ts`, **sem imports**, exportando
  `RUBRICA_REDACAO_VERSAO = 'bars-prd-1.1'` e `DIMENSOES_REDACAO = [{ chave:'D1', rotulo:'Especificidade da
  situação', ancoras:{1..5} }, …]` transcrita de `docs/conhecimento/fit-cultural/bars-redacao-4-dimensoes.md` v1.1
  (âncoras e caps). A EF monta o bloco a partir dela; o front importa a mesma constante
  (`import … from '../../../../supabase/functions/_shared/bars-redacao'`, precedente `exportacaoService.ts:61`).
  É «uma única constante» no sentido literal do D-25.
- **Sem versão nova de prompt:** o prompt vivo já manda «Use as âncoras BARS fornecidas no input» [VERIFIED:
  `regexp_matches` no `system_template`]; o bloco entra por `vagaRubricBlock` (2º bloco de `system`, com cache).
  Isso muda o fingerprint de idempotência (a rubrica entra na chave — `requestFingerprint`, `ai-client.ts:363-372`),
  então nenhuma avaliação velha é replayada sob a rubrica nova.
- **Sem schema novo:** manter `dimension: z.enum(["D1".."D4"])` e `.length(4)`; tornar `dimension_name` irrelevante
  — a EF confere depois do parse que o conjunto `{dimension}` é exatamente `{D1,D2,D3,D4}` (sem repetição) e
  **grava o rótulo da constante**, não o devolvido. `structured-output-compat.test.ts` segue verde sem registro novo;
  `SCHEMA_VERSIONS` não muda. (Um literal por posição exigiria tupla, que o strict mode da OpenAI não aceita
  [ASSUMED].)
- **Colisão de códigos:** `perguntas_redacao.codigo ∈ {C1,C2,C3,D1,D2,D3,F1,PADRAO_BS,R1}` [VERIFIED]. O bloco hoje é
  `Pergunta (D1): …`. Trocar para `Pergunta: <texto>` (sem código) no mesmo bloco da rubrica.
- **Versão na linha (D-26):** coluna `redacoes_candidato.rubrica_versao text` (NULL nas 2 antigas = «rubrica sem
  âncoras enviadas»). Entra no checklist D-57 da tabela junto com `provedor_ia`/`modelo_ia`. Escritor: EF
  (`service_role`, o `trg_redacao_rh_only_review_fields` não barra).
- **Tela (D-25):** `RedacaoReviewPanel.tsx:47-52` e `RedacaoOverrideForm.tsx:45-50` passam a ler da constante; o
  bloco «Análise da IA» mostra `analise_ia.dimension_scores[k].reasoning` e `.cited_evidence[]` (existem: 4 × ~300–390
  car., 2 citações por dimensão nas 2 redações) e `qualitative_summary`; a leitura atual de `analise_ia.reasoning`/
  `citacoes` (inexistentes) sai. Linha com `rubrica_versao` nula exibe o aviso de versão antiga.
- **Testes obrigatórios:** (1) Deno: o bloco enviado contém os 4 rótulos e âncoras da constante; (2) vitest: os
  rótulos renderizados = a constante (importada no teste); (3) Deno: `dimension` devolvido fora de `{D1..D4}` ou
  repetido ⇒ análise não é gravada como concluída; (4) `RedacaoOverrideForm.test.tsx:35-38` muda de propósito.
- Few-shot (`exemplos-respostas-bars.md`): **não** nesta fase — custa tokens na saída longa que o D-29 acabou de
  medir; o prompt já pede âncoras, não exemplos. Reversível.

### F.2 SJT (`avaliar-redacao`, JORN-35)

- Estado: `index.ts:219-235` lê `perguntas.rubric`; `:256` manda `Vaga: <uuid>`; `:131` `rubricWeights?.[d.dimension] ?? 1`.
- Conserto: bloco com as dimensões **por chave** (`raciocinio_clinico_estetico`, `planejamento_decisao`,
  `comunicacao_expectativa`, `etica_minimamente_invasivo`, `consentimento_continuidade` — os valores vivos de
  `perguntas.rubric.dimensoes[].dimension` [VERIFIED]) com rótulo e âncoras do `PRD-sjt-work-sample-odontologia.md`;
  instrução para devolver `dimension` = a chave; depois do parse, dimensão devolvida que não é chave da rubrica ⇒
  `has_insufficient_evidence`/pendente humano, **nunca** peso 1 em silêncio. O `DimensionScore` do SJT é
  `dimension: string` (`avaliacao-schemas.ts`), então enum por chave dinâmica não cabe no schema estático — a
  checagem é pós-parse.
- A única linha afetada em PROD (`a1dd4c42`, fixture, 2026-06-26, 7/25) fica (mesma lógica do D-26/D-30).

## G. JORN-13, 38, 40 — lista do RH

- **Fonte (D-31..D-33):** um embed `scores_candidato!left(tipo, status, score, score_max)` filtrado no cliente por
  `tipo`, sobre `idx_scores_candidatura`; tirar `scores_bigfive`, `scores_disc`, `analise_ia_cultura`.
  Big Five: `tipo='big_five'` existe (5 linhas, `score` NULL, dados em `metadata.dimensoes`) ⇒ «concluído»/«não fez».
  Cultura: `tipo='redacao'` e `status='sucesso'` (gravada por `sincronizar_score_redacao` depois da revisão) ⇒ nota;
  redação existe sem essa linha ⇒ «aguardando revisão»; sem redação ⇒ «não fez» (precisa de um sinal de «existe
  redação» — `redacoes_candidato!left(id)`). Inteligência: faixa sem percentil (vocabulário: Open Q 4). DISC sai.
- `ScoreCard.tsx`: `getScoreColor` só para cultura (nota 0–100); Big Five e Inteligência sem cor de nota.
- **JORN-38:** `candidato:candidatos(id, nome_completo, email, celular)` e `vaga:vagas(id, titulo)` nas três
  ocorrências (Correção 21); conferir antes os campos lidos por quem consome `listCandidaturasByVaga`.
- **JORN-40:** `LiberacaoCognitivoBlock.tsx:94-109` mostra `Percentil` e `Acertos X de 60`. Recomendado: faixa no
  lugar dos dois (o «Acertos» é a mesma forma; UX-07 diz «telas RH sem percentil numérico»). Levar o «Acertos» ao
  operador junto com a Open Q 4.
- Testes: `ScoreCard.test.tsx` (ausência nunca vira `0`; Big Five sem número), `candidaturasService.test.ts`
  (select sem `*` em `candidatos`), teste novo do bloco cognitivo sem dígito de percentil.

## H. JORN-25, 32, 33, 34 — encerrada

### H.1 Trava no banco (D-35) — desenho da exceção

Recomendado: GUC de transição sancionada, no idioma de `app.rejeicao_sancionada`, **resetada logo depois**:

```sql
-- em avancar_etapa(), logo depois do early-return de L11-13:
IF public.candidatura_encerrada(OLD.etapa_atual, OLD.status)
   AND coalesce(current_setting('app.transicao_sancionada', true), '') NOT IN ('reabertura', 'decisao') THEN
  RAISE EXCEPTION 'candidatura encerrada (etapa %, status %) — não pode mudar de etapa', OLD.etapa_atual, OLD.status
    USING ERRCODE = 'check_violation';
END IF;
```

- `responder_revisao_decisao` (L102-109): `PERFORM set_config('app.transicao_sancionada','reabertura',true)` antes do
  UPDATE e `set_config(…,'',true)` depois — D-01 passa.
- `registrar_decisao` (L117-133): `'decisao'` antes dos dois UPDATEs, reset depois — «decisão» do D-35 passa (inclui
  `triagem/finalizado → aprovado`, o caso legado).
- `rejeitar_candidatura` já recusa encerrada (L47-50); knockout (`submit_candidatura_atomic`) não muda a etapa
  (`inscricao→inscricao`, sai no early-return) — nenhum dos dois precisa de GUC.
- Sancionar por **GUC** e não por «destino terminal»: um PATCH direto `etapa_atual='aprovado'` num knockout pela
  policy `rh_avanca_etapa` seria aceito pela regra de destino, e deixaria `status='rejeitado'` com etapa `aprovado`.
- Reversibilidade: **costly** (D-35). A fixture de `p48_reabertura_smoke.sql:224-227` passa a setar a GUC (entrada
  sancionada) — e o smoke precisa provar que, sem ela, a trava morde.

### H.2 EF do comparativo (JORN-32, D-34, D-28, D-29, rótulo)

Ordem nova em `comparativo-candidatos/index.ts`: teto `2..COMPARATIVO_MAX_CANDIDATOS` → posse → ler
`candidaturas(id, vaga_id, etapa_atual, status)` dos ids: qualquer `vaga_id ≠ body.vaga_id` ⇒ 403 genérico (IDOR);
qualquer encerrada ⇒ 400 `ENCERRADA` «Candidatura encerrada não entra no comparativo»; análise ausente ⇒ 400
`SEM_ANALISE` «Ainda não há análise para: …» → ler análises (allowlist) → ordenar por `score_match DESC,
candidatura_id` (desempate estável) → prompt → resposta `{ ranking, posicoes: {C1: candidatura_id, …}, provedor_ia,
modelo_ia }` → INSERT com `provedor_ia`/`modelo_ia` **checando erro**. O front rotula por `posicoes`, nunca por
índice (`ComparativoCandidatosPage.tsx:66-80`, `DecisaoFinalPage.tsx:66-78`).

### H.3 E-mail (D-35)

`notificar-candidato/index.ts` depois do bloco 3a (L288-298): `evento === "avanco" && candidaturaEncerrada(etapa,
status)` ⇒ `skipped:"encerrada"`, antes do claim. Deploy próprio (EF `verify_jwt=false`).

### H.4 Kanban (JORN-33)

`getTerminalBadge` (`KanbanBoard.tsx:97-116`) passa a usar `candidaturaEncerrada(etapa, status)`; para
`finalizado` em etapa de trabalho, selo «Encerrada». Arraste e menu seguem gateados pelo selo.

### H.5 `UpdateStatusModal` (JORN-34)

- Front: `VALID_TRANSITIONS.rejeitado = []` (`UpdateStatusModal.tsx:63`). Reabrir tem caminho próprio e auditado
  (`responder_revisao_decisao`).
- Banco (defesa, recomendado **escopado ao cliente**): em `guard_rejeicao_auditada` (BEFORE UPDATE OF status),
  recusar `candidatura_encerrada(OLD…) AND NOT candidatura_encerrada(NEW…) AND auth.uid() IS NOT NULL AND GUC
  sancionada ausente`. O escopo por `auth.uid()` preserva o idioma de fixture dos 8 smokes (rodam como `postgres`
  sem JWT — **conferir smoke a smoke** o estado de `request.jwt.claims` na linha do UPDATE) e fecha o PATCH pela
  policy `rh_avanca_etapa`. Alternativa sem escopo: editar as 8 fixturas. Reversível.
- Achado da mesma forma, **fora do texto do JORN-34** (varredura C1 #11): `aprovado_proxima → finalizado` encerra
  por status sem histórico. Levar ao operador (Open Q 5).

### H.6 «Avançar» real (D-36) e população da decisão (D-36b)

Extrair `proximaEtapaDeTrabalho(etapa)` (hoje inline em `HubCandidatoRH.tsx:139` e `KanbanBoard.tsx:179`) e usar no
comparativo. `listFinalistas` passa a `candidaturas.select('id').eq('vaga_id').eq('etapa_atual','decisao_final')`
filtrado pelo predicado — hoje isso dá 1 candidatura em PROD (Correção 23): a tela precisa de estado vazio.

## I. JORN-12 — análise de entrevista com dono

### I.1 Colunas (onda 1, aditivas, todas nulas para não quebrar a EF atual)

`entrevista_analises`: `tipo text CHECK (tipo IN ('online','presencial'))`, `solicitada_por uuid` (funcionário:
fora do export, «dado_de_funcionario» no recibo — precedente `revisada_por`), `texto_hash text`,
`ai_call_log_id uuid` (**sem FK**: o log é purgado em 180 d e o motor redige; precedente `candidate_ai_decisions.ai_call_log_ids uuid[]`),
`superada_em timestamptz` (D-02: marcar, não apagar), `provedor_ia`/`modelo_ia`. «Vigente» = `superada_em IS NULL
AND status_analise <> 'falhou' AND competencias IS NOT NULL` — derivado, não coluna solta.

### I.2 Hash (Discretion)

Recomendado: o **mesmo** hash que o log já grava — `ai_call_logs.input_hash = sha256(maskPII(input))`
(`audit-logger.ts:129-130`). Assim `entrevista_analises.texto_hash = ai_call_logs.input_hash` é conferível por
consulta. Custo aceito: se o código da máscara mudar, o mesmo texto passa a ter outro hash (vira análise nova —
lado seguro). Exportar um helper `hashDoInput(raw)` do `ai-client` para a EF calcular **antes** da chamada.

### I.3 Fluxo da EF (`avaliar-transcricao-entrevista`)

1. Body `.strict()` ganha `tipo` **opcional** (`entrevista-schemas.ts:60-65`); ausente ⇒ derivado da etapa atual.
   EF antes do front (o front novo manda `tipo`; o `.strict()` velho recusaria). D-55.
2. `texto_hash` = hash do input; existe análise vigente com o mesmo `(candidatura, tipo, texto_hash)` ⇒ devolve
   `{ok:true, analise_id, reaproveitada:true}` **sem** chamar a IA e sem linha nova (D-40).
3. Rubrica BARS só do guia **do tipo** (hoje lê todos os guias, `index.ts:198-203`).
4. `callAi` → `log_id`, `model`, `provider`.
5. Falha (parse nulo/injeção): INSERT com `status_analise='falhou'` (não `pendente_humano`), que nunca é vigente.
6. Sucesso: numa RPC nova SECURITY DEFINER (uma transação): marca `superada_em=now()` nas vigentes do mesmo
   `(candidatura, tipo)`, insere a nova, e faz o upsert de `scores_candidato` (`status='pendente_humano'`, D-42). As
   superadas guardam `scores_humanos`/`revisada_por`/`revisao_confirmada_em` (hoje o upsert apaga a nota
   consolidada e a revisão some da tela). **Todo INSERT/RPC checa erro** (hoje `:266,299,309` devolvem `{ok:true}`
   em falha).
7. `salvar_avaliacao_entrevista` (vivo L16-21 `ORDER BY created_at DESC LIMIT 1`) e `confirmar_revisao_entrevista`
   (`p_analise_id`) passam a exigir a vigente; `avancar_etapa` L27-32 passa a olhar só vigentes (no plano da trilha).
- ⚠ `scores_candidato` de entrevista tem `subtipo` NULL: **uma** linha para online e presencial
  (`UNIQUE NULLS NOT DISTINCT (candidatura_id, tipo, subtipo, pergunta_id)`). Com tipo por análise, a nova análise
  presencial zera a nota confirmada da online. Open Q 6.

### I.4 D-43 (checkpoint, contagem antes/depois)

Marcar `superada_em` nas não vigentes das 6: `bf26ee3c` → vigente 01:53:12 (último clique = texto A), superadas
01:37:30, 01:42:04, 01:52:54; `0b1c887b` e `a1dd4c42` → vigentes (únicas). Hash/vínculo: `bf26ee3c` A →
`10dc2cc2-9c0e-48f6-88fd-491a427c1605` / `9adae98a…`; B → `040c9060-d9cc-4854-8288-17aff9d529b5` / `b4234b6d…`;
`0b1c887b` → `9633ec2f-ef61-4110-b958-61b194cd4f08` / `1c8053db…`; `a1dd4c42` → nulos. [VERIFIED; a
correspondência das duplicatas é por igualdade de `competencias`/`citacoes`]

## J. Trilha — JORN-17, 3b, 37 (um plano para as três funções que compartilham GUC)

### J.1 `avancar_etapa()` hoje (vivo = `20260712110001_avancar_etapa_auto_rejeitado_fix.sql`)

L11-13 early-return se a etapa não muda · L15-21 regressão exige `NEW.etapa_justificativa` (terminais isentos) ·
L24-37 bandeira de entrevista sobre **todas** as análises · L40-47 INSERT no histórico com
`NEW.etapa_justificativa` e `auto_rejeitado` pela GUC · L49 `RETURN NEW`. Mudanças (um plano, uma migration):
trava D-35 depois de L13; L27-32 só vigentes; `NEW.etapa_justificativa := NULL;` entre L47 e L49. Nenhum trigger
posterior lê a coluna (BEFORE: `trg_candidaturas_guard_rejeicao` lê `status`, `update_candidaturas_updated_at`;
AFTER: `trg_candidatura_encerrada_a_pedido` lê `encerrada_a_pedido_em`), e nenhuma transição sancionada depende de
o valor sobreviver (`responder_revisao_decisao` escreve e não relê; `registrar_decisao` idem) [VERIFIED].

### J.2 Snapshot (D-44) — mecanismo recomendado

```sql
DROP TRIGGER trg_decisao_final_snapshot ON public.decisao_final;
CREATE TRIGGER trg_decisao_final_snapshot AFTER UPDATE ON public.decisao_final FOR EACH ROW
  WHEN ((to_jsonb(OLD) - 'explicacao_solicitada_em' - 'alerta_prazo_enviado_em')
        IS DISTINCT FROM (to_jsonb(NEW) - 'explicacao_solicitada_em' - 'alerta_prazo_enviado_em'))
  EXECUTE FUNCTION public.snapshot_decisao_final();
```

Cobre coluna nova sem manutenção (a mudança de coluna nova arquiva). A decisão (`em = now()` sempre muda), o ciclo
de revisão, a reabertura e o tombstone do motor (muda `justificativa`) seguem arquivando — a ordem snapshot→scrub do
motor não muda. `stamp_explicacao_acessada` L21-24 ganha `AND explicacao_solicitada_em IS NULL` + re-SELECT
(Correção 30). Teste de colunas (smoke novo): `colunas(decisao_final) − {id, em} + {decidido_em}` =
`colunas(decisao_final_historico) − {id, arquivado_em}`, lido do catálogo na execução — reprova se divergirem
(quando nascer coluna em `decisao_final`, `snapshot_decisao_final` L8-17 precisa da coluna nova na lista).

### J.3 `registrar_decisao` (D-47)

L122 e L132: `etapa_justificativa = p_justificativa` → constante sem PII, ex. `'Decisão final registrada (a
justificativa fica em decisao_final)'` (precedente: a reabertura grava texto próprio, `responder_revisao_decisao`
L105-107). Recomendado constante e não NULL: a trilha continua legível. D-47 retroativo: **5 linhas** (Correção 11),
consulta de seleção casando corrente **e** arquivo.

## K. JORN-36 — motor (onda 5, depois de todas as colunas e das decisões A/B do Portão)

- Passo novo dentro de `anonimizar_candidato` (vivo; últimas `20260805000009` / `20260823000006`), **antes** de
  `severar_fks_set_null` (L544), por `candidatura_id IN (SELECT id FROM candidaturas WHERE candidato_id = …)`:
  sentinela em `text`/`jsonb` NOT NULL; NULL onde a coluna aceita; decisão A para int/enum; a redação de
  `analise_ia` e da `metadata` SJT remove `cited_evidence` por `jsonb_set`/reconstrução; `ai_call_logs`:
  `user_prompt_template` na mesma UPDATE de L555-559 (antes de `candidato_id := NULL`, que é o que permite
  achá-las) + decisão B para `comparative_ranking`; `revisao_resultado` nos UPDATEs de L524-540 (Portão 3).
- `plano_exclusao_titular` (vivo; `20260823000008`) conta as mesmas colunas (o dry-run é o espelho).
- Contagens no retorno (`'passos'`, L708-726) ganham o passo novo; o `P45DR` do dry-run lista os números.
- `p45_motor_exclusao_smoke.sql` ampliado: uma asserção de pós-estado por coluna nova do passo + prova de que a
  asserção morde (mutação: passo desligado ⇒ FAIL).
- Primeira execução real = **checkpoint** em conta de teste (D-54).

## Architecture Patterns

### Fluxo de dados (depois da fase)

```
RH clica «Avançar» ──► triagemService.updateCandidaturaEtapa ──► UPDATE candidaturas (PostgREST, RLS rh_avanca_etapa)
                                                                     │
                              avancar_etapa() BEFORE ◄───────────────┘
                              ├─ etapa igual? → sai
                              ├─ encerrada(OLD) e sem GUC sancionada? → RAISE (D-35)
                              ├─ regressão sem justificativa? → RAISE
                              ├─ bandeira na análise VIGENTE? → RAISE
                              ├─ INSERT historico_candidatura (criterio_texto = NEW.etapa_justificativa)
                              └─ NEW.etapa_justificativa := NULL (JORN-17)
                                                                     │
                              trg_notif_transicao AFTER INSERT ──► net.http_post ──► notificar-candidato
                                                                                     └─ encerrada? skipped (D-35)

EF de IA ──► callAi ──► [hash do input] ──► replay? (não para fallback) ──► Anthropic parse (formato embrulhado)
                                                   ├─ ok ─────────────────────────────► 1 linha anthropic/success
                                                   └─ max_tokens/timeout/schema/… ──► linha anthropic/success=false (custo)
                                                                                      └─► OpenAI (max_tokens/temperature do prompt)
                                                                                          └─► linha openai/fallback_<causa>
                     ◄── CallAiResult { parsed, provider, model, log_id, replayed, fallback_cause }
EF ──► tabela de resultado (provedor_ia, modelo_ia [+ texto_hash, ai_call_log_id, tipo, superada_em]) — erro checado
Front ──► selo «gerado por <modelo> (fallback)» quando modelo ≠ configurado; PDF do comparativo idem
```

### Recommended structure (onde cada peça mora)

```
supabase/functions/_shared/
├── ai-client.ts            # E.2 (dono único)
├── audit-logger.ts         # E.3 (devolve id/erro)
├── bars-redacao.ts         # NOVO, sem imports: rubrica D1–D4 + versão (EF e front)
├── sjt-rubrica.ts          # NOVO, sem imports: rótulos/âncoras do PRD-sjt por chave
└── comparativo-config.ts   # NOVO, sem imports: COMPARATIVO_MAX_CANDIDATOS
supabase/migrations/2026092x…_p49_*.sql   # uma por plano de banco
supabase/tests/p49_*.sql                  # smokes novos + p49_prova_prod.sql
src/lib/candidatura/proximaEtapa.ts       # NOVO (D-36)
```

### Anti-Patterns to Avoid
- **Rótulo por posição** (`C{n}` → `selection[n-1]`; `D1` → mapa próprio da tela): rotular pela chave que a EF devolve.
- **Consertar pela tela o que o banco aceita** (knockout «Avançar»): a trava é no trigger; a tela é a segunda camada.
- **`cache_hit` como «não chamou a IA»** (Correção 8).
- **GUC sancionada sem reset** (Correção 31).
- **Nova coluna `NOT NULL` antes do escritor novo**: quebra a EF velha entre migration e deploy (D-55).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detectar truncamento | regex na mensagem do erro | `stop_reason === 'max_tokens'` (formato embrulhado) | a mensagem muda entre versões do SDK; o `stop_reason` é contrato |
| Hash do texto da transcrição | hash próprio com outra normalização | `computeInputHash(maskPII(raw))` (`audit-logger.ts:112-118`) | é o que `ai_call_logs.input_hash` já grava — o vínculo fica conferível |
| «Encerrada» | lista local de status | `candidatura_encerrada()` / `candidaturaEncerrada()` | D-21 da 48 |
| Diff de linha no snapshot | lista de colunas no `WHEN` | `to_jsonb(OLD) - … IS DISTINCT FROM to_jsonb(NEW) - …` | coluna nova entra sozinha |
| Artefatos de compliance | editar JSON/TS gerados | os 4 geradores + `--check` | `check:*` reprova divergência |
| Tipos | editar `database.types.ts` | `npm run db:types < /dev/null` | trunca sem o `< /dev/null` |

## Runtime State Inventory

Não é fase de rename; o inventário cobre as escritas retroativas e o estado que o código não recria.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | 9 `etapa_justificativa` grudadas (D-46); 5 linhas de histórico com a justificativa da decisão (D-47); 6 análises sem marca (D-43); 17 logs `anthropic_retries_exhausted` e 2+1+… resultados de fallback (ficam, D-30); 5 snapshots sem mudança (ficam, D-45); 2 redações com rubrica fantasma (ficam, D-26) | 3 UPDATEs retroativos com checkpoint; o resto fica |
| Live service config | `prompt_versions.max_tokens` do `comparative_ranking` (3000 → 3600) | migration com guarda de valor esperado |
| OS-registered state | cron `ai-cost-aggregation` (agrupa por `provider`) e `ai-logs-retention-cleanup` — nenhum muda; o enum ganha `none` | nenhuma — verificado por `cron.job` |
| Secrets/env vars | nenhum novo; `AI_TOTAL_BUDGET_MS`/`MAX_ATTEMPTS`/`AI_CALL_TIMEOUT_MS` seguem | nenhuma |
| Build artifacts | 7 EFs com `_shared/ai-client.ts` embarcado (5 com bundle de 06/09); `exportar-meus-dados` e `executar-direito-titular` embarcam os artefatos gerados; front na Vercel (chunks lazy `/rh/*`, `/admin/*`) | redeploy por EF (`efdeploy.cjs`), push do `main` |

## Common Pitfalls

### Pitfall 1: O upsert por `idempotency_key` engole a linha da tentativa falha
**What goes wrong:** gravar a tentativa Anthropic e a do fallback com a mesma chave deixa só a última.
**How to avoid:** tentativa com `idempotency_key` NULL (insert simples). **Warning sign:** `count(*)` por chamada = 1 depois de um fallback forçado.

### Pitfall 2: A trava D-35 recusando a própria reabertura
**What goes wrong:** OLD de `responder_revisao_decisao` é `rejeitado/rejeitado` (encerrada). **How to avoid:** GUC `reabertura` antes do UPDATE; `p48_reabertura_smoke` (a)(g)(h) verdes. **Warning sign:** «candidatura encerrada» no smoke de reabertura.

### Pitfall 3: Coluna nova quebrando EF velha
**What goes wrong:** `tipo NOT NULL` em `entrevista_analises` antes do deploy da EF nova ⇒ INSERT falha (e hoje a EF devolve `{ok:true}` mesmo assim). **How to avoid:** tudo nulo na onda 1; `NOT NULL`, se algum dia, depois.

### Pitfall 4: `.strict()` do body recusando o front novo
**What goes wrong:** front manda `tipo` antes da EF aceitar ⇒ 400. **How to avoid:** EF (campo opcional) → front.

### Pitfall 5: Snapshot suprimido no tombstone
**What goes wrong:** um `WHEN` que exclua `justificativa` apagaria a prova do motor. **How to avoid:** excluir só as duas colunas do D-44; asserção no `p45_motor_exclusao_smoke`.

### Pitfall 6: O passo novo do motor abortando depois do Storage
**What goes wrong:** `NOT NULL`/`CHECK` (Correção 14) ou o `trg_redacao_rh_only_review_fields` com JWT de admin (Correção 18) abortam a transação do passo 2 depois do passo 1 (Storage) já feito. **How to avoid:** dry-run (`p_dry_run` default) em conta de teste com cada tabela populada; o bloco de auto-verificação da função confere nulidade no catálogo (padrão das L499-502).

### Pitfall 7: Smoke que reprova o conserto certo
**What goes wrong:** `p48_rejeicao_triagem:245`, `p48_reabertura:224-227`, `ai-client.test.ts` (5 blocos). **How to avoid:** mudar a asserção de propósito no mesmo plano do conserto e provar que ainda morde.

### Pitfall 8: Deploy da EF antes da migration do enum/colunas
**What goes wrong:** EF grava `provedor_ia` ou `provider='none'` antes de a coluna/valor existir ⇒ PGRST204/22P02 (e o `audit-logger` hoje engole). **How to avoid:** onda 1 aplicada e conferida no catálogo antes de qualquer deploy da onda 3.

### Pitfall 9: Teto do comparativo em 8 lugares
**How to avoid:** uma constante; `grep` do padrão P3 da varredura no verify.

## Code Examples

### Formato embrulhado (detecção de truncamento sem trocar `parse`)
```typescript
// Fonte do comportamento: @anthropic-ai/sdk@0.102.0 lib/parser.js:51-64 + resources/messages/messages.js:61-62
const FALHA_PARSE = Symbol.for("callAi.falhaParse");
const fmt = zodOutputFormat(schema, prompt.call_type) as { parse?: (c: string) => unknown };
const fmtSeguro = fmt && typeof fmt.parse === "function"
  ? { ...fmt, parse: (c: string) => { try { return fmt.parse!(c); } catch (e) { return { [FALHA_PARSE]: e }; } } }
  : fmt;
const response = await anthropic.messages.parse({ /* …, */ output_config: { format: fmtSeguro } }, { timeout, maxRetries: 0 });
const falha = (response.parsed_output as Record<symbol, unknown> | null)?.[FALHA_PARSE];
const causa = response.stop_reason === "max_tokens" ? "anthropic_max_tokens"
  : response.stop_reason === "refusal" ? "anthropic_refusal"
  : falha ? "anthropic_schema_invalid" : null;
// response.usage está disponível nos três casos → custo da tentativa
```

### Trava com GUC resetada (idioma do projeto)
```sql
-- em responder_revisao_decisao, em volta do UPDATE de L102-109
PERFORM set_config('app.transicao_sancionada', 'reabertura', true);
UPDATE public.candidaturas SET etapa_atual = 'decisao_final', status = 'em_analise', … WHERE id = p_candidatura_id;
PERFORM set_config('app.transicao_sancionada', '', true);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `max_tokens` (OpenAI) | `max_completion_tokens` (`max_tokens` `@deprecated`) | openai 6.x (`completions.d.ts:1627-1635`) | usar `max_completion_tokens` no fallback |
| inferir truncamento pela mensagem | `stop_reason` | — | E.2 |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A API da OpenAI usa `temperature=1` quando o parâmetro é omitido | E.1 | só muda a justificativa; o conserto (passar o do prompt) vale igual |
| A2 | O strict mode da OpenAI não aceita tupla (literal por posição) | F.1 | se aceitar, ainda assim a checagem pós-parse é suficiente |
| A3 | Modelo de saída do comparativo: P ≈ 280–410 tok/candidato, F ≈ 1260–1500 | D-29 | teto errado para cima (trunca) ou para baixo (recusa demais); a prova de n=4 mede |
| A4 | Os 8 smokes do idioma de fixture rodam o UPDATE de status sem JWT | H.5 | a guarda escopada por `auth.uid()` morderia a fixture; conferir smoke a smoke |
| A5 | `a1dd4c42`/`0b1c887b`/`bf26ee3c` são as únicas candidaturas com análise de entrevista também no momento da execução | I.4 | a contagem do checkpoint muda; o D-43 exige contar antes |

## Open Questions

1. **Decisão A (respostas int/enum no motor)** — recomendação (a) apagar as linhas das 4 tabelas de múltipla escolha. Operador.
2. **Decisão B (linhas `comparative_ranking` no log)** — recomendação: redigir a linha inteira. Operador.
3. **`analise_candidato_vaga` e `entrevista_guias` classificadas «sem PII do titular»** (Correção 17): corrigir a classificação no checklist D-57 desta fase (recomendado: sim, é texto de inventário) e decidir se o motor desidentifica `resumo_cv`/`guia` (recomendado: registrar para depois — é escopo novo).
4. **Vocabulário da faixa cognitiva** (D-33/JORN-40): `scores_raven.classificacao` (norma do instrumento) ou `cognitivoBanda` (3 faixas provisórias do ScoreCard)? E o «Acertos X de 60» sai junto? Recomendação: `cognitivoBanda` nas telas do RH (é a que o ScoreCard e o UX-07 já usam) e o «Acertos» sai.
5. **`aprovado_proxima → finalizado` no `UpdateStatusModal`** (encerra sem histórico): entra no JORN-34? Recomendação: sim, a mesma linha de `VALID_TRANSITIONS`.
6. **`scores_candidato` de entrevista com uma linha só** para online e presencial (I.3): manter (a última análise de qualquer tipo zera a nota, que é o D-42) ou uma por tipo (`subtipo = tipo`, muda o `consolidar-decisao-final`)? Recomendação: manter nesta fase e registrar.
7. **SJT sem proveniência** (Correção 29): entra (na `metadata`, sem coluna)? Recomendação: sim, custo zero de checklist.
8. **`interview_guide` a 89 % do timeout** (Correção 4): só registrar (P1) ou baixar `max_tokens` para o teto por tempo (~4950)? Recomendação: registrar; o JORN-28 torna a falha visível.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | `p46apply.cjs`, `efdeploy.cjs`, geradores | ✓ | 24.18.0 | — |
| Deno | testes das EFs | ✓ | 2.9.4 | — |
| Supabase CLI | `db:types` | ✓ | 2.116.0 | — |
| Token da Management API (Keychain «Supabase CLI»/«supabase») | apply, deploy, leitura | ✓ | — | `SUPABASE_ACCESS_TOKEN` |
| Contas de teste da jornada (`+claude`) | prova em PROD | ✓ (6 candidatos `+claude`) | — | — |

**Missing dependencies with no fallback:** nenhum.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (front + `docs/compliance`), Deno test (EFs), smokes SQL por `node p46apply.cjs run`, prova por consulta só leitura |
| Config file | `vite.config.ts` (vitest), `supabase/functions/deno.json` |
| Quick run command | `npx vitest run <paths>` · `deno test --allow-all <arquivos>` (listar os `*.test.ts` e excluir `strict-schema.test.ts`, deferred 48-07) |
| Full suite command | `npx vitest run` (baseline 205/2068) · `find supabase/functions -name "*.test.ts" \| grep -v strict-schema \| xargs deno test --allow-all` |
| Portão tsc | `T=$(mktemp); npm run -s lint >"$T" 2>&1; RC=$?; C=$(grep -c "error TS" "$T"); { [ $RC -eq 0 ] && [ $C -eq 0 ]; } \|\| { [ $RC -eq 2 ] && [ $C -le 90 ]; }` |
| Portão git | `test -z "$(git log --oneline origin/main..HEAD)"` depois de todo apply com efeito visível |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| JORN-28 | truncamento/timeout/schema viram `error_code` próprio; 2 linhas no fallback; fallback com `max_completion_tokens`/`temperature`; replay não serve fallback; `model` real no resultado | unit (Deno) | `deno test --allow-all supabase/functions/_shared/__tests__/ai-client.test.ts supabase/functions/_shared/__tests__/ai-client-budget.test.ts` | ✅ (asserções 289-298, 306-338, 437-453, 460-479, 482-510, 646 mudam de propósito) |
| JORN-28 | proveniência gravada nas 5 tabelas | PROD query | `select count(*) filter (where modelo_ia is null) … where created_at > T0` = 0 por tabela | ❌ `p49_prova_prod.sql` |
| JORN-28 | D-29 recusa > 4; `max_tokens=3600` | unit + PROD | `deno test … comparativo-candidatos/__tests__/index.test.ts` · `select max_tokens from prompt_versions where call_type='comparative_ranking' and is_active` = 3600 | ✅ / ❌ |
| JORN-28 | log do admin mostra «Fallback» | unit (vitest) | `npx vitest run src/features/admin/ai-logs` | ❌ Wave 0 |
| JORN-39 | linha `none` grava; erro não é engolido | unit + PROD | Deno `ai-client.test.ts` (mock que recusa o insert → alerta) · `select count(*) from ai_call_logs where provider='none'` ≥ 1 após injeção de teste | ✅ / ❌ |
| JORN-13/38/40 | ausência nunca vira 0; sem `candidatos(*)`; sem percentil | unit (vitest) | `npx vitest run src/components/__tests__/ScoreCard.test.tsx src/features/vagas/services/__tests__/candidaturasService.test.ts` + teste novo do bloco cognitivo | ✅ / ❌ |
| JORN-07 | bloco enviado = constante; tela = constante; `dimension` inválido reprova | unit (Deno + vitest) | `deno test --allow-all supabase/functions/avaliar-redacao-cultural/` · `npx vitest run src/features/triagem/components/__tests__/RedacaoOverrideForm.test.tsx` | ✅ (35-38 muda) / ❌ teste do painel |
| JORN-07 | redação nova tem `rubrica_versao` e dimensões D1..D4 | PROD | `select bool_and(rubrica_versao = 'bars-prd-1.1') from redacoes_candidato where ia_processada_em > T0` | ❌ |
| JORN-35 | pesos pela chave; nome inválido não vira peso 1 | unit (Deno) | `deno test --allow-all supabase/functions/avaliar-redacao/` | ✅ |
| JORN-25 | trava recusa encerrada; reabertura passa; e-mail `avanco` pula encerrada | smoke + unit | `node p46apply.cjs run supabase/tests/p49_trilha_smoke.sql` (em envelope que aborta se houver dispatch) · `node p46apply.cjs run supabase/tests/p48_reabertura_smoke.sql` · Deno `notificar-candidato/__tests__/` | ❌ / ✅ |
| JORN-25 | seleção sem encerrada; «Avançar» real; rótulo por `candidatura_id` | unit (vitest) | `npx vitest run src/features/triagem src/components/pages` | ✅ (TriagemTable/ComparativoScreen) |
| JORN-32 | IDOR 403 | unit (Deno) | `deno test … comparativo-candidatos/__tests__/index.test.ts` | ✅ (191-259 mudam) |
| JORN-33/34 | Kanban pelo predicado; sem `rejeitado → em_analise` | unit (vitest) + smoke | `npx vitest run src/components/__tests__/KanbanBoard.test.tsx src/components/modals/__tests__/UpdateStatusModal.test.tsx` | ✅ |
| JORN-12 | vigente única por tipo; falha nunca vigente; mesmo texto não cria linha; revisão anterior preservada | unit + smoke + PROD | Deno `avaliar-transcricao-entrevista/` · `p49_analise_vigente_smoke.sql` · prova A/B/A: `select count(*)` = 2 e vigente = B | ❌ |
| JORN-17 | justificativa limpa; regressão sem texto novo recusada | smoke | `p49_trilha_smoke.sql` + `p48_rejeicao_triagem_smoke.sql` (245 ajustada) + `oper31` (c) | ✅ / ❌ |
| JORN-17 | D-46 | PROD | `select count(*) from candidaturas where etapa_justificativa is not null` = 0 (antes 9) | ❌ |
| JORN-3b | leitura não versiona; colunas iguais | smoke + PROD | `p49_snapshot_smoke.sql`; prova: N recargas → `count(*)` do arquivo inalterado | ❌ |
| JORN-37 | trilha sem o texto da decisão | smoke + PROD | `select count(*) from historico_candidatura h where criterio_texto = (d.justificativa)` = 0 (antes 5) | ❌ |
| JORN-36 | motor apaga cada coluna do recibo | smoke | `node p46apply.cjs run supabase/tests/p45_motor_exclusao_smoke.sql` (ampliado, dry-run revertido) | ✅ (ampliar) |
| D-57 | colunas novas com veredito | gerador | `npm run -s check:export-allowlist && npm run -s check:pii-inventory-md && npm run -s check:recibo-exclusao && npm run -s check:matriz-retencao && npx vitest run docs/compliance` · `node p46apply.cjs run docs/compliance/sql/05-export-allowlist-drift.sql` sem colunas da fase | ✅ |

### `p49_prova_prod.sql` (forma)

Mesmo contrato do `p48_prova_prod.sql`: um SELECT só, prefixado por `SET TRANSACTION READ ONLY; SELECT set_config('p49.t0', '<T0>', false);`, contas de teste = `candidatos.email ILIKE '%+claude%'`, só o que aconteceu depois de T0, conjunto vazio sai `false`. Uma coluna booleana por critério:

`p28_resultados_com_modelo` · `p28_fallback_com_duas_linhas` (se houve fallback depois de T0) · `p28_teto_comparativo_3600` · `p28_comparativo_4_anthropic` · `p39_linha_none_existe` (após injeção de teste) · `p13_sem_leitura_de_tabela_morta` (negativa; checada no bundle, não no banco) · `p07_redacao_nova_com_rubrica` · `p25_knockout_nao_avanca` (tentativa registrada no smoke; em PROD: nenhum `historico` `inscricao→avaliacao_assincrona` de candidatura encerrada depois de T0) · `p25_sem_avanco_para_encerrada` (ledger `notificacoes_enviadas` sem `avanco` para encerrada depois de T0) · `p12_uma_vigente_por_tipo` · `p12_aba_sem_linha_de_cache` · `p17_sem_justificativa_grudada` · `p3b_leitura_sem_snapshot` · `p37_trilha_sem_texto_da_decisao` · `p36_recibo_verdadeiro_na_conta_de_teste` (após o checkpoint do motor).

### Sampling Rate
- **Per task commit:** o quick run dos arquivos tocados + portão tsc.
- **Per wave merge:** vitest inteiro + Deno das EFs tocadas + smokes da onda (`p46apply run`, envelope que aborta para os que despacham).
- **Phase gate:** tudo verde + `p49_prova_prod.sql` todo `true` antes do `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `supabase/tests/p49_trilha_smoke.sql` — JORN-17, JORN-25 (trava + reabertura + decisão), JORN-37
- [ ] `supabase/tests/p49_snapshot_smoke.sql` — JORN-3b (leitura, no-op, colunas iguais, tombstone ainda arquiva)
- [ ] `supabase/tests/p49_analise_vigente_smoke.sql` — JORN-12
- [ ] `supabase/tests/p49_prova_prod.sql`
- [ ] testes vitest: painel da redação, bloco cognitivo, `AiLogsPage`, `proximaEtapa`
- [ ] Deno: `bars-redacao` × bloco enviado; SJT por chave; `notificar-candidato` `avanco`/encerrada

## Security Domain

### Applicable ASVS Categories (L1)

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | não (nenhum fluxo novo) | — |
| V3 Session Management | não | — |
| V4 Access Control | **sim** | JORN-32 (posse comparada à vaga das análises); trava D-35; RLS inalterada; `solicitada_por` = `auth.uid()` no servidor |
| V5 Input Validation | sim | Zod `.strict()` dos bodies (`tipo` enum); checagem pós-parse das dimensões |
| V6 Cryptography | não (sha256 de reprodutibilidade, não segredo) | `crypto.subtle` |
| V8 Data Protection | **sim** | D-48 (motor), D-47 (BD-9), JORN-38 (minimização), reclassificação do inventário |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR por `vaga_id` do body | Information disclosure | comparar a vaga de cada candidatura com a vaga cuja posse foi checada |
| PATCH direto em `candidaturas` pela policy `rh_avanca_etapa` | Tampering | trava no trigger; guarda de status escopada ao cliente |
| Fallback silencioso como decisão de um modelo não avaliado | Repudiation | proveniência por linha + duas linhas de log |
| Justificativa interna chegando ao titular pela trilha | Information disclosure | D-47 |
| Recibo que afirma apagamento não feito | Repudiation (para com o titular) | D-48 + smoke por coluna |

## Plano / ondas propostas (D-55: dono único por objeto; migration → EF → cliente)

| Onda | Plano | Toca (dono único) | Depende de |
|---|---|---|---|
| 1 | **49-01** Schema aditivo: colunas D-28 nas 5 tabelas, `rubrica_versao`, colunas do D-38/D-39/D-41 em `entrevista_analises` (todas nulas), `llm_provider += 'none'`; `db:types < /dev/null` | migration nova | — |
| 1 | **49-02** `_shared/ai-client.ts` + `audit-logger.ts` (E.2/E.3), só testes Deno; sem deploy | `_shared/ai-client.ts`, `audit-logger.ts` | — (código); deploy fica com os donos das EFs |
| 2 | **49-03** Trilha: `avancar_etapa` (D-35 + JORN-17 + vigente), `registrar_decisao` (GUC + D-47), `responder_revisao_decisao` (GUC), `guard_rejeicao_auditada` (JORN-34), smokes | as 4 funções | 49-01 |
| 2 | **49-04** Snapshot `WHEN` + `stamp` idempotente + smoke de colunas | trigger, `stamp_explicacao_acessada` | — |
| 2 | **49-05** `notificar-candidato`: `avanco` para encerrada | EF | — |
| 3 | **49-06** `comparativo-candidatos` (IDOR, encerrada, teto, `max_tokens`, proveniência, `posicoes`) + deploy | EF + `prompt_versions` | 49-01, 49-02 |
| 3 | **49-07** Rubricas: `bars-redacao.ts`, `sjt-rubrica.ts`, `avaliar-redacao-cultural`, `avaliar-redacao` + deploys | 2 EFs | 49-01, 49-02 |
| 3 | **49-08** Entrevista: `avaliar-transcricao-entrevista` (I.3), RPC de inserção/superação, `salvar_avaliacao_entrevista`/`confirmar_revisao_entrevista`, `gerar-guia-entrevista` (proveniência) + deploys | 2 EFs + 3 RPCs | 49-01, 49-02, 49-03 |
| 3 | **49-09** Proveniência/JORN-39 nas demais: `analise-candidato-individual`, redeploy `gerar-devolutiva-bigfive` | 2 EFs | 49-01, 49-02 |
| 4 | **49-10** Retroativos com checkpoint: D-46 (9), D-47 (5), D-43 (6) | dados | 49-03, 49-08 |
| 4 | **49-11** Lista do RH (JORN-13/38/40) | front | 49-01 |
| 4 | **49-12** Comparativo UI + Kanban + `UpdateStatusModal` + PDF (D-34/36/36b, 33, 34, selo) | front | 49-06, 49-03 |
| 4 | **49-13** Redação UI (D-25) + Entrevista UI (D-41, vigente/superadas) + selos de fallback + `AiLogsPage` (D-27c) | front | 49-07, 49-08, 49-02 |
| 5 | **49-14** Motor (JORN-36 + Portão 3 + decisões A/B) + recibo (origens) + `p45` ampliado; 1ª execução = checkpoint | `anonimizar_candidato`, `plano_exclusao_titular`, `gen-recibo-exclusao.cjs` | 49-01, decisões do operador |
| 5 | **49-15** Checklist D-57 de todas as colunas da 49-01 (+ reclassificações), allowlist **1.3.0**, redeploy `exportar-meus-dados`/`executar-direito-titular` | geradores de compliance | **49-14** (mesmo gerador do recibo) |
| 6 | **49-16** `p49_prova_prod.sql` + jornada com contas de teste (D-29 n=4, A/B/A, knockout, recargas) | prova | tudo |

Nenhum par de planos da mesma onda reescreve o mesmo objeto: 49-03 e 49-04 tocam funções distintas; 49-06..09
tocam EFs distintas (o `_shared` é só lido); 49-14 → 49-15 são sequenciais porque os dois escrevem
`gen-recibo-exclusao.cjs` e os dois espelhos TS.

## Sources

### Primary (HIGH confidence)
- PROD `isljnozzlvckrgjjbjwp`, só leitura (`node p46apply.cjs sql "SET TRANSACTION READ ONLY; …"`): `pg_get_functiondef` de `avancar_etapa`, `registrar_decisao`, `responder_revisao_decisao`, `solicitar_revisao_decisao`, `snapshot_decisao_final`, `stamp_explicacao_acessada`, `anonimizar_candidato`, `plano_exclusao_titular`, `candidatura_encerrada`, `rejeitar_candidatura`, `guard_rejeicao_auditada`, `salvar_avaliacao_entrevista`, `confirmar_revisao_entrevista`, `trg_notif_transicao`, `prevent_published_prompt_edit`, `trg_redacao_rh_only_review_fields`, `liberar_cognitivo`, `calcular_score_geral`; `pg_trigger`, `pg_constraint`, `pg_indexes`, `pg_policies`, `information_schema`, `cron.job`; contagens em `ai_call_logs`, `prompt_versions`, `comparativo_solicitado`, `entrevista_analises`, `redacoes_candidato`, `scores_candidato`, `decisao_final(_historico)`, `historico_candidatura`, `candidaturas`.
- Management API `GET /v1/projects/…/functions` (versões e `verify_jwt`).
- Código do SDK no cache do Deno: `@anthropic-ai/sdk@0.102.0` (`resources/messages/messages.js`, `lib/parser.js`, `helpers/zod.js`, `messages.d.ts`), `openai@6.42.0` (`lib/parser.js`, `completions.d.ts`).
- Repositório: arquivos citados por linha ao longo do documento.

### Secondary (MEDIUM confidence)
- PostgreSQL 17 docs — `ALTER TYPE … ADD VALUE` em transação.

### Tertiary (LOW confidence)
- Default de `temperature` da OpenAI (A1); strict mode × tupla (A2).

## Metadata

**Confidence breakdown:**
- Estado vivo e correções: HIGH — medido nesta sessão, definições vivas lidas.
- D-29: MEDIUM — throughput e razão car./token medidos; saída por candidato estimada de 4 saídas de junho e de 1 truncamento; a prova n=4 fecha.
- Desenhos (E.2, H.1, I.3, J.2): MEDIUM — recomendados sobre evidência; reversíveis exceto onde marcado.
- Motor (K): MEDIUM — as colisões de esquema são fato; a forma depende das decisões A/B.

**Research date:** 2026-09-22
**Valid until:** 2026-09-29 (PROD muda a cada jornada de teste; recontar antes de cada checkpoint)
