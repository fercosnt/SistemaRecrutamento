# PRD — Redação Fit Cultural (M2 · Etapa 3)

**Autor**: Fernando + Claude · **Data**: 2026-05-12 · **Status**: Draft v1.1
**Nível**: Standard (mini-PRD subordinado ao [Master M2](./PRD-MASTER-funil-rh-m2.md))
**Substitui**: [`docs/prds/fit-cultural-prd.md`](../fit-cultural-prd.md) — DEPRECATED
**Upstream**: Master §6.3 (RF-16/17), Master §8.2/§8.4 (`redacoes_candidato` + `avaliar-redacao`), Master §8.8 (RAG), [`CULTURA-BEAUTY-SMILE-INPUT.md`](../CULTURA-BEAUTY-SMILE-INPUT.md), [`fit-cultural-banco-itens-v1.md`](../fit-cultural-banco-itens-v1.md) (referência de cenários)
**RAG**: [`docs/conhecimento/fit-cultural/`](../../conhecimento/fit-cultural/) (4 arquivos curados + cópia do CULTURA-INPUT)
**Template de prompt**: [`docs/conhecimento/prompts/templates/06-culture-fit-essay.md`](../../conhecimento/prompts/templates/06-culture-fit-essay.md) v1.0 + few-shot inline (Nível 1/3/5)

> **Mudança fundamental vs. PRD original**: o PRD antigo (`fit-cultural-prd.md`) modelava o teste cultural como **SJT/Likert/Ranking de 25 itens**. Este PRD adota **redação aberta de 200-500 palavras avaliada por IA com BARS 4D (pesos iguais V1) + revisão humana**. As 25 itens do banco-v1 viram **fonte de cenários para construir perguntas customizadas**, não mais o instrumento principal.
>
> **v1.1 (2026-05-12)** revisa v1.0 (2026-05-10) com decisões refinadas em sessão interativa de design: pergunta padrão Opção B (cuidar de pessoa em fragilidade); 12 templates de perguntas customizáveis (3 por cargo) com defaults ON/OFF; BARS pesos iguais 25% V1 (calibrar V2); sistema 3 cores threshold; **few-shot inline** com 3 exemplos calibrados (Camila/Rodrigo/Mariana); schema 3 tabelas (em_progresso + final + banco); hash anti-plágio intercandidato V1; UI 1-redação-por-vez (comparativo V2).

---

## 0. Sumário Executivo

A Redação Fit Cultural é o instrumento qualitativo da Etapa 3 (Avaliação Assíncrona). Cada candidato responde **2 ou 3 redações abertas** de 200-500 palavras cada (1 padrão Beauty Smile fixa + 1 ou 2 customizáveis por template de cargo). A Edge Function `avaliar-redacao` usa Claude Sonnet 4.6 com **BARS 4D** (especificidade · ação · aprendizado · alinhamento valores), pesos iguais 25% V1, retornando scores 1-5 por dimensão + score 0-100 + citações textuais. **Classificação por 3 cores** (verde ≥65 / amarelo 41-64 / vermelho ≤40 OU red_flag_etico OU D1≤2) prioriza fila de revisão. Revisão humana é **sempre** obrigatória; threshold dispara badge mas **nunca** auto-rejeição (RNF-07a). **Sem devolutiva ao candidato** (eliminatório expõe critério). **Sem detector ChatGPT** — follow-up ao vivo na Etapa 4. **Hash anti-plágio intercandidato** flagga em V1 sem bloquear.

**Custo**: ~R$ 0,025 por call IA (Master §8.4 aloca R$ 0,02 + buffer 25%) · 2-3 chamadas por candidato → R$ 0,05-0,075 redação/candidato.

---

## 1. Problema & Contexto

### 1.1 Problema central

Beauty Smile precisa filtrar candidatos com **alinhamento cultural mensurável e auditável**, não impressão pessoal do entrevistador. Volume previsto na Etapa 3 (~30 candidatos/vaga após knock-out + triagem RH) torna inviável triagem qualitativa puramente humana. Ao mesmo tempo, a Beauty Smile rejeita Culture Fit Index proprietários caixa-preta (Gupy Match, Harver) e instrumentos psicométricos genéricos — quer modelo próprio que capture cenários odontológicos reais com os 4 valores oficiais (UAU · Inovação · Atitude de Dono · Sede de Crescimento).

### 1.2 Evidências

- **Person-Organization fit** (Kristof 1996; Kristof-Brown et al. 2005 meta): P-O fit é preditor robusto de retenção, satisfação e performance.
- **Custo de saída precoce na Beauty Smile**: 3-6 meses de salário por candidato que vai embora < 90 dias por desencontro cultural ([CULTURA-BEAUTY-SMILE-INPUT §1](../CULTURA-BEAUTY-SMILE-INPUT.md)).
- **Redação aberta vs múltipla escolha**: redação reduz socially desirable responding — candidato que decora "respostas certas" tem dificuldade em fabricar episódio concreto, datado e com sequência consistente.
- **Style Neutralization (Rao et al. 2025, "Invisible Filters")**: LLMs penalizam estilo de escrita não-anglo-saxônico — em PT-BR vira viés contra candidatos NE com estilo formal/rebuscado e Sul com estruturas frasais distintas. Mitigação obrigatória no prompt (Cite Before You Speak + bias_audit no output).
- **Few-shot BARS** (Anthropic prompt eng + literatura): exemplos calibrados inline reduzem variância de scoring 30-40% vs apenas âncoras textuais.

### 1.3 Contexto histórico

PRD original (`fit-cultural-prd.md`) modelava teste como SJT/Likert/Ranking de 25 itens. Em sessão de design 2026-04-26 decidiu-se que SJT cabe melhor no instrumento dedicado de Work Sample odontológico (mini-PRD `PRD-sjt-work-sample-odontologia.md`, futuro). Fit cultural ganha tratamento distinto via redação aberta — captura nuance qualitativa que SJT fechado não captura (ownership, especificidade, aprendizado real).

---

## 2. Objetivos & Métricas

### 2.1 Objective (OKR)

> Reduzir rotatividade < 90 dias por desencontro cultural em ≥ 30% nas vagas que usaram redação como filtro Etapa 3, mantendo throughput Etapa 3 → Etapa 4 ≥ 60%.

### 2.2 Métrica Primária

| Métrica | Alvo V1 | Como medir |
|---------|---------|------------|
| Concordância IA × revisor humano (Cohen's κ por dimensão) | κ ≥ 0,60 (substantial) por dim | Após 50 redações revisadas, calcular κ entre `scores_dimensao` IA e `scores_humanos` |

### 2.3 Métricas Secundárias

| Métrica | Alvo | Como medir |
|---------|------|------------|
| Taxa de redações com `flags[]` não vazias | ≤ 25% | SQL count |
| Tempo médio de revisão humana por redação (amarelo+vermelho) | ≤ 4 min | Telemetria UI |
| Drop-off na escrita (abrir + não submeter) | ≤ 15% | localStorage events vs DB inserts |
| Distribuição de scores por cargo (sem viés sistemático) | CV de `score_geral` por cargo dentro de ±15% da média | SQL agregado mensal |
| Cache hit rate Anthropic (system + BARS + few-shot cacheado) | ≥ 70% após warmup | Anthropic billing dashboard |

### 2.4 Métricas Guardrail (NÃO podem piorar)

| Métrica | Threshold de bloqueio |
|---------|-----------------------|
| Falso positivo (IA marca vermelho, RH discorda) | > 10% bloqueia rollout — recalibrar prompt + BARS |
| `bias_audit.formality_did_not_affect_score = false` (auto-reportado IA) | > 5% bloqueia — recalibrar style neutralization |
| Ratio de eliminatório por cargo (regra 4/5 EEOC) | < 80% paridade entre cargos comparáveis bloqueia rollout |

### 2.5 Métricas aspiracionais V2

- Validação preditiva: correlação `score_geral` redação vs avaliação 90-180d do contratado (ρ ≥ 0,30).
- Análise inter-perguntas: pergunta padrão vs customizada — qual discrimina melhor (para banco V2).

---

## 3. Escopo

### 3.1 V1 — MVP M2 (estimativa: 1-2 semanas dentro da Phase 2 do M2)

- 3 tabelas: `perguntas_redacao` (banco) + `redacoes_candidato_em_progresso` (autosave) + `redacoes_candidato` (final + análise IA + revisão humana)
- 1 pergunta padrão Beauty Smile fixa (Opção B — cuidar de pessoa em fragilidade) + **12 templates customizáveis** seedados (3 por cada um dos 4 templates de cargo do Master)
- Editor de redação no candidato com counter de palavras 200-500 + autosave 30s localStorage + 30s DB sync
- Edge Function `avaliar-redacao` (especificada Master §8.4) com prompt v1.0 baseado em `06-culture-fit-essay.md` + RAG dos 4 arquivos + **3 exemplos few-shot inline cacheados**
- BARS 4D **pesos iguais 25% cada** (V1) com 3 caps especiais (red_flag_etico cap 30; D1≤2 cap 50; insufficient_evidence só para inválida)
- UI revisão RH: **1 redação por vez** com sidebar de pendentes ordenadas por cor (vermelho > amarelo > verde)
- Sistema 3 cores threshold: 🟢 ≥65 / 🟡 41-64 / 🔴 ≤40 OU red_flag_etico OU D1≤2
- Hash anti-plágio intercandidato (sha256 do texto normalizado) — flag, sem bloqueio automático
- Sem timer rígido (cronômetro informativo + tracking analytics)
- Sem devolutiva ao candidato

### 3.2 V2 (após validação) — estimativa: +3-6 semanas pós-launch

- Comparativo lado-a-lado de até 3 finalistas na mesma pergunta (reusa feature comparativo Etapa 2)
- BARS pesos por dimensão recalibrados com dados reais (V1 = peso igual fixo)
- Pesos por valor por cargo modulando D4 (V1 = peso fixo 25% sem modulação por cargo)
- Banco curado de 5+ perguntas por cargo (substitui templates default; RH escolhe ranking)
- Validação preditiva contra avaliação 90d/180d
- Auto-flag de redações com follow-up sugerido pra Etapa 4 (entrevista online)
- Hash de similaridade aproximada (MinHash/SimHash ou embeddings) — se hash exato V1 perder muito caso

### 3.3 V3 (futuro)

- 1 redação cultural pós-decisão final como referência longitudinal (medir evolução de fit em revisões anuais)
- Banco de itens dinâmico (RH vê quais perguntas estão discriminando bem e adapta)
- Fine-tuning específico Beauty Smile (apenas após 1000+ redações etiquetadas)

---

## 3b. Fora do Escopo

| Item | Por quê | Quando reconsiderar |
|------|---------|---------------------|
| **Detector de ChatGPT** | Detecção é unreliable (FP ~30%, FN ~25%); bloqueia candidatos legítimos. Estratégia BS: follow-up ao vivo Etapa 4 cobre o caso real. | Quando ferramenta de detecção tiver < 5% FP validado. |
| **Devolutiva ao candidato** | Eliminatório expõe critério → candidatos otimizam contra a régua. Trade-off: privacidade do critério > transparência. | Se LGPD Art. 20 jurídico exigir devolutiva mínima — então feedback genérico "redação não atingiu critério mínimo" sem dimensões. |
| **Detector de plágio cross-internet** (Copyleaks/Originality.ai) | ~R$ 0,30/call (12× custo IA atual), envia texto candidato a terceiros (LGPD), conflita com filosofia "sem detector ChatGPT". | Se incidente real de plágio em larga escala for documentado. |
| **Similaridade aproximada in-house** (MinHash/SimHash/embeddings) | V1 cobre 90% dos casos relevantes com hash exato (paste literal). | Volume > 200 candidatos/vaga ou incidente. |
| **Timer rígido na UI** | Sem detector ChatGPT, timer não tem função anti-cheat. Cronômetro informativo + autosave bastam. Timer rígido prejudica candidatos lentos cuidadosos (que tendem a escrever melhor) e premia rápidos superficiais. | Se telemetria V2 mostrar tempos médios > 4h consistentemente. |
| **BARS por cargo** (5 conjuntos de âncoras) | Trabalho 5x sem ganho proporcional V1. Pesos iguais 25% + few-shot calibrados são suficientes. | Se κ humano-IA divergir > 0,3 entre cargos no piloto. |
| **Modulação D4 por valor × cargo** | V1 simplifica (pesos iguais). V2 modula D4 quando `pergunta.valor_primario` corresponde ao peso alto do cargo (`valores-beauty-smile-resumo.md`). | V2, com dados de κ V1 para justificar peso variável. |
| **Validação preditiva contra retenção 90/180d** | Exige base de pelo menos 30 contratações com redação preenchida. | V2 quando base existir. |
| **Pergunta customizável ad-hoc do RH (Q3+)** | V1 aceita só do banco de 12 templates seedados. Ad-hoc cabe em V2 com validação UX e flag de "pergunta não-validada". | V2, com diretrizes FAÇA/NÃO-FAÇA já documentadas em [`docs/conhecimento/fit-cultural/pergunta-padrao-redacao.md`](../../conhecimento/fit-cultural/pergunta-padrao-redacao.md). |

---

## 4. Personas & Casos de Uso

### Persona 1 — Camila (Candidata, vaga Recepcionista, ensino médio completo, primeiro emprego formal)

Acessa o link da Etapa 3 do celular num horário livre. Vê 3 testes pendentes (SJT + Big Five + Redação). Escolhe começar pela redação porque "parece mais simples". Lê a pergunta padrão BS, pensa numa situação real (cliente atrasada no antigo emprego de farmácia), começa a digitar. Counter mostra 87/200 — continua. Fecha o app porque o telefone toca; volta 30 min depois e o autosave (sync DB) restaurou o que digitou. Termina com 312 palavras, submete. Lê a pergunta customizada R1 ("problema que ninguém apontou"), pensa um pouco mais, escreve 268 palavras, submete. Não recebe nota — só "etapa concluída, em análise".

### Persona 2 — Sara (RH, Coordenadora de Recrutamento)

Abre painel da vaga "Recepcionista — unidade Vila Olímpia". Filtra `cor_classificacao_redacao = 'vermelho'`. Encontra 4 de 27 candidatos. Abre o primeiro com layout focado (1 redação por vez, sidebar lista pendentes). Vê texto integral à direita, score IA + citações + reasoning à esquerda. Score D4=1 + citação `"se eu chego no horário e o paciente atrasa, problema dele"`. Concorda com a IA, marca decisão "reprovado", justifica em 1 frase (≥50 chars). Atalho `J` próximo. Próximo: IA marcou D4=1 mas Sara discorda — candidato falou de uma situação tensa mas ação foi correta no contexto. Sara abre form override: ajusta `scores_humanos.D4=4`, escreve `notas_revisor`, marca "duvida — escalar pro Dr. Pedro". Tempo médio: 3 min por redação revisada.

### Persona 3 — Dr. Pedro (Gestor de Clínica, dentista responsável)

Recebe na fila redações com `decisao_revisor = 'duvida'` da Sara (1-3/semana). Lê redação integral primeiro (sem ver IA + nota Sara), forma sua opinião, depois compara. Decisão final dele encerra `status_avaliacao = 'concluida'`. Pode reverter para "aprovado" ou bater a decisão "reprovado" da Sara com justificativa expandida (≥100 chars).

---

## 5. User Stories & Epic Hypotheses

### Épico — Filtro cultural Etapa 3 com IA + revisão humana

**Hipótese**: Se substituirmos triagem cultural manual por redação aberta avaliada por IA com BARS 4D + revisão humana obrigatória, conseguiremos manter throughput Etapa 3→4 ≥ 60% **e** reduzir rotatividade < 90d em 30%, mantendo κ IA-humano ≥ 0,60 em todas as 4 dimensões.

**Tiny act of discovery (pré-piloto)**: 20 redações de funcionários atuais Beauty Smile (com expectativa "score alto") avaliadas pela IA antes de exposição a candidatos reais. Medir κ inicial com revisão de 3 humanos (Sara + Dr. Pedro + 1 sócio). Calibrar BARS e few-shot se κ < 0,60 em qualquer dimensão.

**User stories:**
- **US-R-01** (candidato): Como candidato, quero escrever a redação em qualquer dispositivo, parar e voltar, sem perder o que digitei.
- **US-R-02** (candidato): Como candidato, quero saber quantas palavras escrevi em tempo real para gerir o limite 200-500.
- **US-R-03** (RH): Como RH, quero ver no painel da vaga só candidatos com redação vermelha primeiro, para focar minha atenção onde importa.
- **US-R-04** (RH): Como RH, quero discordar do score IA quando o contexto não foi capturado direito, sem que isso quebre a auditoria LGPD.
- **US-R-05** (Gestor): Como gestor, quero ver redações em "dúvida" da RH e bater a palavra com justificativa expandida.
- **US-R-06** (Configurador): Como configurador de vaga, quero escolher 1 ou 2 perguntas customizáveis do banco seedado por cargo, com defaults razoáveis.

---

## 6. Requisitos Funcionais

> **Convenção:** RF-R prefixados como "Redação". Numeração local. Refinamentos do Master (RF-16, RF-17, RF-18) referenciados como "↻ Master RF-X".

### 6.1 Editor de redação (UX candidato)

| ID | Requisito | Critério de Aceite |
|----|-----------|--------------------|
| RF-R-01 | Tela `/candidato/redacao/[candidatura_id]` lista as 2-3 perguntas configuradas para a vaga (ordem fixa: Q1 padrão BS sempre primeiro, depois Q2/Q3 customizáveis) | Cada pergunta abre em accordion próprio; candidato responde em ordem mas pode pular Q2 e voltar |
| RF-R-02 | Counter de palavras em tempo real (`X / 200-500`), com código de cores: vermelho < 200, verde 200-500, amarelo > 500 | Atualizado a cada keystroke com debounce 200ms |
| RF-R-03 | Botão "Enviar" por pergunta DISABLED se `word_count < 200` ou `> 500` (hard ambos lados — V1 sem soft max) | Tooltip explicando faixa exata |
| RF-R-04 | Autosave a cada 30s no localStorage + 30s sync com `redacoes_candidato_em_progresso` (cross-device) + debounce de 3s no pause de digitação | Reabrir em outro device restaura último DB sync; reabrir mesmo browser pós-crash restaura localStorage primeiro |
| RF-R-05 | Submit individual por pergunta — candidato submete Q1, depois Q2 etc. Avançar etapa só após todas submetidas | Botão "Avançar" do `BlocoAvaliacao` valida que todos os testes da Etapa 3 (SJT + BigFive + Redação) estão submetidos |
| RF-R-06 | Pós-submit: candidato vê mensagem genérica "Resposta registrada. Você pode revisar até concluir a etapa" + botão para próxima pergunta | Sem score, sem feedback IA, sem indicação de qualidade (RF-19b Master) |
| RF-R-07 | Antes de "Concluir Etapa 3", candidato pode editar qualquer redação (substitui texto). Após concluir, edição bloqueada | Backend rejeita UPDATE em redação cuja candidatura já tem `etapa_atual != 'avaliacao_assincrona'` |
| RF-R-08 | Cronômetro INFORMATIVO discreto (sem countdown, sem cor de alarme) + estimativa "Tempo estimado: 15-25 min" no topo | Sem timeout; `tempo_gasto_segundos` persistido no submit pra analytics |
| RF-R-09 | Flag `tempo_anormalmente_curto` aplicada server-side se `tempo_gasto_segundos < 90s` total | Input pra revisão humana, não rejeição automática |

↻ **Master RF-16 (refinado)**: "Redação fit cultural: 1 pergunta padrão Beauty Smile + 1-2 customizáveis por template de cargo, **200-500 palavras com counter em tempo real** + autosave 30s local + 30s DB sync + cronômetro informativo (sem timeout). Sem soft max — submit bloqueia < 200 ou > 500." Critério: "Validação client + server (hard 200 ambos lados); autosave dupla; UI sem timer rígido; counter visível com código de cores."

### 6.2 Edge Function `avaliar-redacao`

| ID | Requisito | Critério de Aceite |
|----|-----------|--------------------|
| RF-R-10 | Trigger: HTTP POST do candidato após submit da pergunta. Input: `{redacao_id}` (server resolve resto via DB) | Idempotente em redacao_id; reprocessar não duplica row |
| RF-R-11 | Função carrega contexto RAG de `docs/conhecimento/fit-cultural/`: `valores-beauty-smile-resumo.md` + `bars-redacao-4-dimensoes.md` + `pergunta-padrao-redacao.md` + `exemplos-respostas-bars.md` | Filesystem read em cold start, cache em memória entre invocações; latência ≤ 50ms só carregar contexto |
| RF-R-12 | Função usa template `06-culture-fit-essay-v1.0.md` (style-neutralization + Cite Before You Speak + bias_audit obrigatório no output) | `prompt_version='06-culture-fit-essay-v1.0'` gravado em `redacoes_candidato.prompt_version` |
| RF-R-13 | **Few-shot inline cacheado**: 3 exemplos completos (Nível 1 Camila / Nível 3 Rodrigo / Nível 5 Mariana) injetados no system prompt com `cache_control: ephemeral` | `cache_hit_rate >= 70%` após warmup (10 calls); custo extra inicial ~R$ 0,01/call cobrado pelo cache subsequente |
| RF-R-14 | Output Zod-validado conforme schema `EssayScoringV1` (§7.4): `dimension_scores[4]` cada 1-5 ou `insufficient_evidence`, `cited_evidence[]`, `overall_score`, `bias_audit{}`, `recommendation`, `red_flag_etico:boolean` | Schema falha → retry 1x; se falhar 2x → status `falhou` + flag `'output_invalido'` |
| RF-R-15 | Score geral 0-100 calculado server-side: `score_geral = (D1+D2+D3+D4)/4 × 20` (pesos iguais V1) | Persistido em `score_ponderado_0_100` denormalizado pra query rápida |
| RF-R-16 | **3 caps especiais aplicados pós-scoring**: (a) `red_flag_etico=true` → `score_geral = MIN(score_geral, 30)` + flag obrigatória; (b) `D1 score ≤ 2` → `score_geral = MIN(score_geral, 50)` + flag `'situacao_generica_ou_inventada'`; (c) `insufficient_evidence` apenas para `word_count < 200 OR redação fora do tema OR prompt injection detected` | Caps aplicados em pipeline determinístico; logs auditáveis |
| RF-R-17 | **Classificação 3 cores** computada server-side: 🟢 `verde` se `score_geral ≥ 65` ; 🟡 `amarelo` se `41-64` ; 🔴 `vermelho` se `score_geral ≤ 40 OR red_flag_etico=true OR D1≤2` | Persistido em `classificacao_cor` denormalizado; trigger `bloqueio_avanco=true` se vermelho |
| RF-R-18 | **Hash anti-plágio intercandidato**: ANTES do INSERT em `redacoes_candidato`, computa `texto_hash = sha256(normalize(texto))` onde `normalize()` = lowercase + remove pontuação + collapse whitespace. Se query `SELECT count(*) FROM redacoes_candidato WHERE texto_hash = $1 AND candidatura_id != $2 > 0`: INSERT mesmo assim com flag `possivel_plagio_intercandidato=true` + array `referencia_match[]` com candidatura_ids match | Sem bloqueio automático; revisão humana decide |
| RF-R-19 | Em caso de Anthropic API down: retry exponencial 3x (1s/2s/4s); se falhar → `status_analise='falhou'` + flag `'ia_unavailable'` + alerta interno; revisão humana 100% manual sem IA | Padrão idêntico Master RF-05 |
| RF-R-20 | Audit log obrigatório: `prompt_version`, `model_version`, `input_hash` (SHA256 do texto), `output`, `cost_tokens_input/output`, `generated_at`, `candidatura_id` em todas as chamadas | RNF-09 Master; query SQL retroativa funcional |

↻ **Master RF-17 (refinado)**: "Redação avaliada por `avaliar-redacao` em 4 dimensões BARS: especificidade situação · ação demonstrada · aprendizado · alinhamento valores. **Pesos iguais 25% cada V1** (V2 calibra com dados). **Classificação 3 cores** com caps `red_flag_etico→30`, `D1≤2→50`, threshold cor padrão `vermelho ≤40 / amarelo 41-64 / verde ≥65`." Critério: "Score 1-5 por dimensão + citação textual + score 0-100 + flags + bias_audit + red_flag_etico bool; persistido em `redacoes_candidato`."

### 6.3 UI revisão RH

| ID | Requisito | Critério de Aceite |
|----|-----------|--------------------|
| RF-R-21 | Tela `/rh/candidato/:id/redacao`: layout 1 redação por vez. Painel esquerdo (35%): nome candidato (pseudo), pergunta, score IA por dim + citações + reasoning, flags, sliders override `scores_humanos`, textarea `notas_revisor` (≥50 chars), radio `decisao_revisor` (aprovado/reprovado/duvida) | Reuso de `/rh/candidato/:id/*` namespace existente do M2 |
| RF-R-22 | Painel direito (65%): texto integral da redação em font legível (16-18px line-height 1.6), citações destacadas em cor da dimensão correspondente | Sem outra distração visual |
| RF-R-23 | Sidebar lista todas redações pendentes na vaga com filtro por cor (vermelho > amarelo > verde) | Default: filtro `vermelho+amarelo` (verde só sob demanda) |
| RF-R-24 | Atalhos teclado: `J`/`K` next/prev redação ; `A` aprovar (com confirm modal) ; `R` reprovar (com confirm modal + obriga justificativa expandida) ; `D` duvida (escala pro gestor) ; `?` mostra atalhos | Acessibilidade: também via clique nos botões |
| RF-R-25 | Override de score humano default = score IA quando RH abre primeira vez. Salvar revisão grava `scores_humanos jsonb` + `notas_revisor` + `decisao_revisor` + `revisada_por` + `revisada_em` | Trigger BEFORE UPDATE valida que só campos de revisão mudaram (não texto, hash, IA) |
| RF-R-26 | Badge vermelho topo da redação se `classificacao_cor='vermelho'` + tooltip explicando qual regra disparou (score ≤40 / red_flag_etico / D1≤2) | Badge sempre visível; obrigatório clicar "Salvar revisão" pra avançar candidato |
| RF-R-27 | Decisão "duvida" do RH escala automaticamente para o gestor da vaga (notification + lista própria do gestor `/rh/gestor/duvidas`) | Reuso do agente n8n já planejado pra notificações periféricas (Master §8.7) |
| RF-R-28 | Após `decisao_revisor` final salva (aprovado ou reprovado, não duvida), `status_analise` da redação vira `'concluida'` e candidato pode avançar etapa (se outras redações também concluídas) | Trigger DB de validação |

### 6.4 Configuração da vaga (RH)

| ID | Requisito | Critério de Aceite |
|----|-----------|--------------------|
| RF-R-29 | Ao criar vaga com `template_cargo` ∈ {`dentista_padrao`, `recepcao_padrao`, `coord_admin_padrao`, `freela_simples`}, sistema seed default das perguntas customizadas marcadas ON no banco | UI mostra checkbox por template (3 perguntas) com defaults pré-marcados |
| RF-R-30 | RH pode marcar/desmarcar customizáveis até limite máximo 2 (Q1 padrão sempre fixa); pode escolher do banco completo de 12 (não apenas as do template do cargo) | Validação UI: total perguntas = 1 + (0 a 2) |
| RF-R-31 | Threshold cor de classificação editável por vaga: 2 inputs (vermelho-acima-de N, amarelo-acima-de N), default V1 = (40, 64) | Validação: vermelho_max < amarelo_max < 100 |
| RF-R-32 | V1: criação de pergunta ad-hoc do RH FORA DO ESCOPO. V2 abrirá com validação (≥30 chars, não-idêntica, valor_primario obrigatório) | UI v1: apenas seleção do banco |

---

## 7. Requisitos Não-Funcionais

| ID | Categoria | Requisito | Métrica | Como Testar |
|----|-----------|-----------|---------|-------------|
| RNF-R-01 | Performance | Edge Function `avaliar-redacao` | P95 ≤ 20s (texto 200-500 + RAG ~5KB + few-shot ~3KB) | Logging Vercel + alerta > 20s |
| RNF-R-02 | Performance | Save UI candidato (Submit pergunta → DB) | P95 ≤ 2s | Telemetria |
| RNF-R-03 | Performance | UI revisão RH render redação + análise IA | P95 ≤ 1s | Lighthouse |
| RNF-R-04 | Custo | Custo médio por redação avaliada (com cache hit) | ≤ R$ 0,025 | Anthropic billing × redações/mês |
| RNF-R-05 | Segurança | RLS em `redacoes_candidato`, `redacoes_candidato_em_progresso`, `perguntas_redacao` | Zero acesso cross-vaga em E2E | Playwright + pgTAP |
| RNF-R-06 | LGPD | Texto da redação é dado pessoal sensível (revela episódios profissionais identificáveis); access log obrigatório em qualquer SELECT por usuário não-candidato | Tabela `historico_candidatura` com toda leitura RH/admin | SQL audit |
| RNF-R-07 | LGPD | Direito ao esquecimento — DELETE candidatura → CASCADE em ambas tabelas | E2E confirma row count zerado | E2E |
| RNF-R-08 | LGPD Art. 20 | Endpoint público de explicação (Master RF-32) inclui resumo qualitativo da redação (não scores IA brutos nem citações específicas) | UAT trimestral | UAT |
| RNF-R-09 | Bias | Style neutralization: prompt v1.0 inclui regras Rao 2025 + bias_audit; auditoria mensal flagga `bias_audit.formality_did_not_affect_score = false` | Job mensal CSV export → revisão humana | Cronograma operacional |
| RNF-R-10 | Bias | Regra 4/5 EEOC: ratio de eliminatório por cargo ≥ 80% paridade entre cargos comparáveis | Audit mensal, parte do RNF-07b global Master | SQL agregado |
| RNF-R-11 | Idioma de produto | Linguagem "redação cultural" / "avaliação comportamental" — NUNCA "teste psicológico" | Grep CI | Lint custom |
| RNF-R-12 | Auditoria IA | Toda chamada `avaliar-redacao` loga: redacao_id, prompt_version, model_version, input_hash, output, cost_tokens, generated_at | 100% auditáveis SQL | SQL |
| RNF-R-13 | Reproducibility | `temperature: 0` + `prompt_version` versionado garante determinismo dado mesmo input | Re-execução do mesmo redacao_id retorna scores idênticos ± marginal | Test sintético |
| RNF-R-14 | TTL `_em_progresso` | Rows de autosave anonimizadas + texto_em_progresso zerado após 90d do `completou_em` (ou abandono após 30d sem submit) | Cron job mensal | SQL |

---

## 8. Considerações Técnicas

### 8.1 Schema (incremento sobre Master §8.2)

#### `perguntas_redacao` (NOVA — banco de templates)

```sql
CREATE TABLE perguntas_redacao (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          text UNIQUE NOT NULL,            -- 'PADRAO_BS', 'D1','D2','D3','R1','R2','R3','C1','C2','C3','F1'
  texto           text NOT NULL CHECK (length(texto) >= 30),
  template_cargo  text CHECK (template_cargo IN ('dentista_padrao','recepcao_padrao','coord_admin_padrao','freela_simples') OR template_cargo IS NULL),
  valor_primario  text CHECK (valor_primario IN ('uau','inovacao','atitude_de_dono','sede_de_crescimento','etica','multi')),
  valor_secundario text CHECK (valor_secundario IN ('uau','inovacao','atitude_de_dono','sede_de_crescimento','etica','multi') OR valor_secundario IS NULL),
  is_padrao       boolean NOT NULL DEFAULT false,
  default_on      boolean NOT NULL DEFAULT false,  -- marcada como ON no template
  ativa           boolean NOT NULL DEFAULT true,
  versao          smallint NOT NULL DEFAULT 1,
  criada_em       timestamptz NOT NULL DEFAULT now()
);

-- Apenas UMA pergunta com is_padrao=true ativa
CREATE UNIQUE INDEX idx_perguntas_padrao_unica
  ON perguntas_redacao (is_padrao) WHERE is_padrao = true AND ativa = true;

CREATE INDEX idx_perguntas_cargo
  ON perguntas_redacao(template_cargo) WHERE ativa = true;
```

**Seed inicial** (migration `15_seed_perguntas_redacao.sql`): 13 rows = 1 PADRAO_BS + 12 customizáveis (3 dentista_padrao + 3 recepcao_padrao + 3 coord_admin_padrao + 3 freela_simples conforme [`pergunta-padrao-redacao.md`](../../conhecimento/fit-cultural/pergunta-padrao-redacao.md)).

#### `redacoes_candidato_em_progresso` (NOVA — autosave incremental)

```sql
CREATE TABLE redacoes_candidato_em_progresso (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id        uuid NOT NULL REFERENCES candidaturas(id) ON DELETE CASCADE,
  pergunta_id           uuid NOT NULL REFERENCES perguntas_redacao(id),
  texto_em_progresso    text,
  word_count            int,
  iniciado_em           timestamptz NOT NULL DEFAULT now(),
  ultima_atividade_em   timestamptz NOT NULL DEFAULT now(),
  completou_em          timestamptz,
  user_agent            text,
  CONSTRAINT em_progresso_uq UNIQUE (candidatura_id, pergunta_id)
);

CREATE INDEX idx_em_progresso_atividade
  ON redacoes_candidato_em_progresso(ultima_atividade_em);
```

RLS: candidato R/W só própria. CRP/RH apenas R. Cron TTL: anonimiza texto + zera após 90d do completou_em ou 30d sem atividade.

#### `redacoes_candidato` (NOVA — registro final auditável)

```sql
CREATE TABLE redacoes_candidato (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id           uuid NOT NULL REFERENCES candidaturas(id) ON DELETE CASCADE,
  pergunta_id              uuid NOT NULL REFERENCES perguntas_redacao(id),
  ordem                    smallint NOT NULL CHECK (ordem BETWEEN 1 AND 3),
  eh_pergunta_padrao       boolean NOT NULL,  -- true se Q1; false se Q2/Q3 customizável

  -- Texto da redação
  texto                    text NOT NULL,
  word_count               int NOT NULL CHECK (word_count BETWEEN 200 AND 500),
  texto_hash               text NOT NULL,  -- sha256(normalize(texto)) — anti-plágio
  tempo_gasto_segundos     int NOT NULL,
  submetida_em             timestamptz NOT NULL DEFAULT now(),

  -- Análise IA (preenchida pela Edge Function)
  analise_ia               jsonb,
  scores_dimensao          jsonb,  -- {D1, D2, D3, D4} cada int|'insufficient_evidence'
  score_ponderado_0_100    numeric(5,2) CHECK (score_ponderado_0_100 BETWEEN 0 AND 100),
  classificacao_cor        text CHECK (classificacao_cor IN ('verde','amarelo','vermelho')),
  red_flag_etico           boolean NOT NULL DEFAULT false,
  flags                    text[] NOT NULL DEFAULT ARRAY[]::text[],
  referencia_match         uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],  -- candidatura_ids match no hash
  prompt_version           text,
  model_version            text,
  input_hash               text,
  cost_tokens_input        int,
  cost_tokens_output       int,
  ia_processada_em         timestamptz,

  -- Revisão humana
  revisada_por             uuid REFERENCES auth.users(id),
  revisada_em              timestamptz,
  scores_humanos           jsonb,
  notas_revisor            text CHECK (notas_revisor IS NULL OR length(notas_revisor) >= 50),
  decisao_revisor          text CHECK (decisao_revisor IN ('aprovado','reprovado','duvida')),

  -- Status + bloqueio
  status_analise           text NOT NULL DEFAULT 'pendente'
                             CHECK (status_analise IN ('pendente','processando','concluida','falhou','pendente_humano')),
  bloqueio_avanco          boolean NOT NULL DEFAULT false,  -- true se vermelho — revisão obrigatória

  CONSTRAINT redacao_uq_pergunta_candidatura UNIQUE (candidatura_id, pergunta_id)
);

CREATE INDEX idx_redacoes_candidatura     ON redacoes_candidato(candidatura_id);
CREATE INDEX idx_redacoes_status          ON redacoes_candidato(status_analise);
CREATE INDEX idx_redacoes_cor             ON redacoes_candidato(classificacao_cor);
CREATE INDEX idx_redacoes_hash            ON redacoes_candidato(texto_hash);  -- anti-plágio
CREATE INDEX idx_redacoes_bloqueio        ON redacoes_candidato(candidatura_id) WHERE bloqueio_avanco = true;

COMMENT ON TABLE redacoes_candidato IS 'Registro final auditável. 1 row por (candidatura, pergunta). RLS: candidato R próprio; RH/admin R todas + UPDATE só em campos de revisão (trigger valida). INSERT apenas via Edge Function service_role.';
```

#### Extensão de `vaga.testes_aplicaveis` (existente, refinada)

```jsonc
{
  "tipo": "redacao",
  "obrigatorio": true,
  "perguntas_codigos": ["PADRAO_BS", "D1", "D2"],  // ordem = ordem apresentação ao candidato
  "threshold_cor": {
    "vermelho_max": 40,
    "amarelo_max": 64
    // verde implicitamente >= amarelo_max+1
  }
}
```

### 8.2 RLS Policies

```sql
ALTER TABLE redacoes_candidato                ENABLE ROW LEVEL SECURITY;
ALTER TABLE redacoes_candidato_em_progresso   ENABLE ROW LEVEL SECURITY;
ALTER TABLE perguntas_redacao                 ENABLE ROW LEVEL SECURITY;

-- ============ redacoes_candidato_em_progresso ============
-- Candidato R/W próprio enquanto candidatura está em 'avaliacao_assincrona'
CREATE POLICY em_progresso_candidato_own ON redacoes_candidato_em_progresso FOR ALL TO authenticated
  USING (
    candidatura_id IN (
      SELECT id FROM candidaturas
      WHERE candidato_id IN (SELECT id FROM candidatos WHERE auth_user_id = auth.uid())
      AND etapa_atual = 'avaliacao_assincrona'
    )
  )
  WITH CHECK (
    candidatura_id IN (
      SELECT id FROM candidaturas
      WHERE candidato_id IN (SELECT id FROM candidatos WHERE auth_user_id = auth.uid())
    )
  );

-- RH lê tudo (telemetria de drop-off)
CREATE POLICY em_progresso_rh_select ON redacoes_candidato_em_progresso FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role')::text IN ('rh','admin'));

-- ============ redacoes_candidato ============
-- Candidato R próprio + INSERT/UPDATE só via Edge Function (service_role bypassa RLS)
CREATE POLICY redacao_candidato_select ON redacoes_candidato FOR SELECT TO authenticated
  USING (
    candidatura_id IN (
      SELECT id FROM candidaturas
      WHERE candidato_id IN (SELECT id FROM candidatos WHERE auth_user_id = auth.uid())
    )
  );

CREATE POLICY redacao_no_client_insert ON redacoes_candidato FOR INSERT WITH CHECK (false);
-- INSERT só via Edge Function `submit-redacao` que roda com service_role

-- RH/Admin: SELECT todas
CREATE POLICY redacao_rh_select ON redacoes_candidato FOR SELECT TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role')::text IN ('rh','admin'));

-- RH/Admin: UPDATE só em campos de revisão (trigger BEFORE UPDATE valida)
CREATE POLICY redacao_rh_update ON redacoes_candidato FOR UPDATE TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role')::text IN ('rh','admin'))
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION trg_redacao_rh_only_review_fields() RETURNS trigger AS $$
BEGIN
  IF (auth.jwt() -> 'app_metadata' ->> 'role')::text IN ('rh','admin') THEN
    IF NEW.texto              IS DISTINCT FROM OLD.texto              OR
       NEW.candidatura_id     IS DISTINCT FROM OLD.candidatura_id     OR
       NEW.pergunta_id        IS DISTINCT FROM OLD.pergunta_id        OR
       NEW.word_count         IS DISTINCT FROM OLD.word_count         OR
       NEW.texto_hash         IS DISTINCT FROM OLD.texto_hash         OR
       NEW.tempo_gasto_segundos IS DISTINCT FROM OLD.tempo_gasto_segundos OR
       NEW.submetida_em       IS DISTINCT FROM OLD.submetida_em       OR
       NEW.analise_ia         IS DISTINCT FROM OLD.analise_ia         OR
       NEW.scores_dimensao    IS DISTINCT FROM OLD.scores_dimensao    OR
       NEW.score_ponderado_0_100 IS DISTINCT FROM OLD.score_ponderado_0_100 OR
       NEW.classificacao_cor  IS DISTINCT FROM OLD.classificacao_cor  OR
       NEW.red_flag_etico     IS DISTINCT FROM OLD.red_flag_etico     OR
       NEW.prompt_version     IS DISTINCT FROM OLD.prompt_version     OR
       NEW.model_version      IS DISTINCT FROM OLD.model_version      OR
       NEW.input_hash         IS DISTINCT FROM OLD.input_hash         THEN
      RAISE EXCEPTION 'RH/admin só pode atualizar campos de revisão (scores_humanos, notas_revisor, decisao_revisor, revisada_*, status_analise, bloqueio_avanco).';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER redacao_rh_only_review_fields
  BEFORE UPDATE ON redacoes_candidato
  FOR EACH ROW EXECUTE FUNCTION trg_redacao_rh_only_review_fields();

-- ============ perguntas_redacao ============
CREATE POLICY perguntas_select_all ON perguntas_redacao FOR SELECT TO authenticated USING (true);
CREATE POLICY perguntas_admin_write ON perguntas_redacao FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin');
```

> **Migration PL/pgSQL**: trigger exige workaround documentado em [`CLAUDE.md`](../../../CLAUDE.md#migrations--db-push--workaround-conhecido-plpgsql) (SQL Editor manual + `migration repair`).

### 8.3 Edge Function `avaliar-redacao` — pseudocódigo (Deno)

```typescript
import { serve } from 'std/http/server.ts';
import { createClient } from 'supabase';
import Anthropic from 'anthropic';
import { EssayScoringV1Schema } from '../_shared/zod-schemas/essay-scoring.ts';
import { loadFitCulturalRAG } from '../_shared/rag/fit-cultural.ts';
import { CULTURE_FIT_ESSAY_TEMPLATE_V1 } from '../_shared/prompts/avaliar-redacao.ts';
import { auditLog } from '../_shared/audit-logger.ts';
import { computeScoreAndCors, normalizeForHash } from './_local/compute-score.ts';

const VERSION = 'avaliar-redacao-v1.0';
const PROMPT_VERSION = '06-culture-fit-essay-v1.0';
const MODEL_ID = 'claude-sonnet-4-6';

serve(async (req) => {
  const { redacao_id } = await req.json();
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // 1. Carregar redação + pergunta + vaga + threshold
  const { data: redacao } = await supabase
    .from('redacoes_candidato')
    .select(`
      id, texto, word_count, candidatura_id, tempo_gasto_segundos,
      pergunta:pergunta_id(texto, valor_primario, valor_secundario, codigo),
      candidatura:candidatura_id(
        vaga:vaga_id(id, template_cargo, testes_aplicaveis)
      )
    `)
    .eq('id', redacao_id)
    .single();

  if (!redacao) return resp(404, 'Redação não encontrada');

  const vagaConfig = (redacao.candidatura.vaga.testes_aplicaveis as any[])
    .find(t => t.tipo === 'redacao');
  const thresholdCor = vagaConfig?.threshold_cor ?? { vermelho_max: 40, amarelo_max: 64 };

  // 2. RAG load (filesystem cached em cold start)
  const rag = await loadFitCulturalRAG(); // { valores, bars, exemplos[3], pergunta_doc }

  // 3. System prompt cacheado (template + bias rules + BARS + 3 exemplos few-shot)
  const systemPrompt = CULTURE_FIT_ESSAY_TEMPLATE_V1.system; // já inclui BARS + few-shot inline

  // 4. User message dinâmico
  const userPrompt = renderUserPrompt({
    perguntaTexto: redacao.pergunta.texto,
    perguntaValorPrimario: redacao.pergunta.valor_primario,
    redacaoTexto: redacao.texto,
    valoresContext: rag.valores,
  });

  // 5. Anthropic call com retry
  const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  let raw: string | null = null;
  let costIn = 0, costOut = 0;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await anthropic.messages.create({
        model: MODEL_ID,
        max_tokens: 3000,
        temperature: 0,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userPrompt }],
      });
      raw = r.content[0].text;
      costIn = r.usage.input_tokens;
      costOut = r.usage.output_tokens;
      break;
    } catch (e) {
      if (i === 2) {
        await markFailed(supabase, redacao_id, 'ia_unavailable');
        return resp(503, 'IA indisponível');
      }
      await sleep(2 ** i * 1000);
    }
  }

  // 6. Validar Zod
  let parsed;
  try {
    parsed = EssayScoringV1Schema.parse(JSON.parse(raw!));
  } catch {
    // retry 1x
    await markFailed(supabase, redacao_id, 'output_invalido');
    return resp(502, 'Output inválido');
  }

  // 7. computeScore aplica pesos iguais + 3 caps especiais + classificação 3 cores
  const { scoreGeral, classificacaoCor, flags, redFlagEtico } =
    computeScoreAndCors(parsed, thresholdCor, redacao.word_count, redacao.tempo_gasto_segundos);

  // 8. Anti-plágio intercandidato (hash já computado no INSERT)
  const { count: matchCount, data: matchIds } = await supabase
    .from('redacoes_candidato')
    .select('candidatura_id', { count: 'exact' })
    .eq('texto_hash', await sha256(normalizeForHash(redacao.texto)))
    .neq('candidatura_id', redacao.candidatura_id);

  if ((matchCount ?? 0) > 0) {
    flags.push('possivel_plagio_intercandidato');
  }

  // 9. Persistir
  await supabase.from('redacoes_candidato').update({
    analise_ia: parsed,
    scores_dimensao: extractScoresDim(parsed),
    score_ponderado_0_100: scoreGeral,
    classificacao_cor: classificacaoCor,
    red_flag_etico: redFlagEtico,
    flags,
    referencia_match: (matchIds ?? []).map(m => m.candidatura_id),
    prompt_version: PROMPT_VERSION,
    model_version: MODEL_ID,
    input_hash: await sha256(redacao.texto),
    cost_tokens_input: costIn,
    cost_tokens_output: costOut,
    ia_processada_em: new Date().toISOString(),
    status_analise: 'pendente_humano',  // sempre pra revisão humana
    bloqueio_avanco: classificacaoCor === 'vermelho',
  }).eq('id', redacao_id);

  // 10. Audit log LGPD
  await auditLog({
    function_name: 'avaliar-redacao',
    redacao_id,
    candidatura_id: redacao.candidatura_id,
    prompt_version: PROMPT_VERSION,
    model_version: MODEL_ID,
    cost_tokens_input: costIn,
    cost_tokens_output: costOut,
    input_hash: await sha256(redacao.texto),
  });

  return resp(200, {
    status: 'ok',
    redacao_id,
    score_ponderado_0_100: scoreGeral,
    classificacao_cor: classificacaoCor,
    flags
  });
});
```

**`computeScoreAndCors`** (lógica determinística):

```typescript
export function computeScoreAndCors(
  parsed: EssayScoringV1,
  threshold: { vermelho_max: number; amarelo_max: number },
  wordCount: number,
  tempoSegundos: number,
): { scoreGeral: number; classificacaoCor: 'verde'|'amarelo'|'vermelho'; flags: string[]; redFlagEtico: boolean } {
  const flags: string[] = [];
  const dims = parsed.dimension_scores;

  // Pesos iguais V1 (25% cada — calibrar V2 com dados)
  let sum = 0, validDims = 0;
  for (const d of dims) {
    if (d.score === 'insufficient_evidence') {
      flags.push(`${d.dimension}_insufficient_evidence`);
      continue;
    }
    sum += d.score as number;
    validDims++;
  }
  let scoreGeral = validDims > 0 ? Math.round((sum / validDims) * 20 * 100) / 100 : 0;

  // Cap (a) — red_flag_etico
  const redFlagEtico = parsed.red_flag_etico ?? false;
  if (redFlagEtico) {
    scoreGeral = Math.min(scoreGeral, 30);
    flags.push('red_flag_etico');
  }

  // Cap (b) — D1 ≤ 2
  const dim1 = dims.find(d => d.dimension === 'D1');
  if (dim1 && typeof dim1.score === 'number' && dim1.score <= 2) {
    scoreGeral = Math.min(scoreGeral, 50);
    flags.push('situacao_generica_ou_inventada');
  }

  // Flag tempo anormalmente curto
  if (tempoSegundos < 90) flags.push('tempo_anormalmente_curto');

  // Cap (c) já tratado upstream (Edge Function `submit-redacao` rejeita < 200 palavras)

  // Classificação 3 cores
  let classificacaoCor: 'verde'|'amarelo'|'vermelho';
  if (scoreGeral <= threshold.vermelho_max || redFlagEtico || (dim1 && typeof dim1.score === 'number' && dim1.score <= 2)) {
    classificacaoCor = 'vermelho';
  } else if (scoreGeral <= threshold.amarelo_max) {
    classificacaoCor = 'amarelo';
  } else {
    classificacaoCor = 'verde';
  }

  return { scoreGeral, classificacaoCor, flags: [...new Set(flags)], redFlagEtico };
}

export function normalizeForHash(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/[.,!?;:"'\(\)\[\]\{\}\-—–_]/g, '')  // remove pontuação
    .replace(/\s+/g, ' ')                            // collapse whitespace
    .trim();
}
```

### 8.4 Zod Schema `EssayScoringV1`

Em [`docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts`](../../conhecimento/prompts/templates/00-shared-zod-schemas.ts):

```typescript
import { z } from 'zod';

const DimensionScoreSchema = z.object({
  dimension: z.enum(['D1','D2','D3','D4']),
  dimension_name: z.string(),  // 'especificidade', 'acao', 'aprendizado', 'alinhamento_valores'
  cited_evidence: z.array(z.object({
    text: z.string().min(1),
    location: z.string(),  // 'Parágrafo 2', 'Frase final', etc
  })).max(2),
  reasoning: z.string().min(20),
  score: z.union([z.number().int().min(1).max(5), z.literal('insufficient_evidence')]),
  level: z.enum(['exemplary','proficient','developing','basic','inadequate','insufficient_evidence']),
});

export const EssayScoringV1Schema = z.object({
  preprocessing_check: z.object({
    word_count: z.number().int(),
    detected_writing_style: z.enum(['formal','informal','mixed','outro']),
    style_neutralized_in_scoring: z.literal(true),
  }),
  dimension_scores: z.array(DimensionScoreSchema).length(4),
  overall_score: z.number().min(0).max(100),  // calculado pela IA, server recalcula
  qualitative_summary: z.string().min(50).max(500),
  recommendation: z.enum(['strong_fit','good_fit','neutral','weak_fit','misfit']),
  red_flag_etico: z.boolean(),  // explícito no output, não derivado
  bias_audit: z.object({
    formality_did_not_affect_score: z.boolean(),
    regional_markers_treated_as_neutral: z.boolean(),
    grammar_errors_did_not_affect_content_score: z.boolean(),
  }),
});

export type EssayScoringV1 = z.infer<typeof EssayScoringV1Schema>;
```

### 8.5 Estrutura de arquivos — incremento sobre Master §8.5

```
src/features/avaliacao-assincrona/
├── components/
│   ├── RedacaoEditor.tsx                  # candidato escreve
│   ├── RedacaoCounter.tsx                 # counter palavras com 3 cores
│   ├── RedacaoCronometro.tsx              # informativo (sem countdown)
│   └── RedacaoSubmitFlow.tsx              # validação client + POST submit
├── hooks/
│   ├── useRedacaoAutosave.ts              # localStorage 30s + DB 30s
│   └── useSubmitRedacao.ts
├── schemas/
│   └── redacao.schema.ts                  # Zod client: 200-500 palavras
└── services/
    └── redacaoService.ts                  # CRUD client-side via Supabase

src/features/triagem-rh/
├── components/
│   ├── RedacaoReviewPanel.tsx             # 1 redação por vez, 35/65% layout
│   ├── RedacaoSidebar.tsx                 # lista pendentes filtrada por cor
│   ├── RedacaoCorBadge.tsx                # verde/amarelo/vermelho
│   └── RedacaoOverrideForm.tsx            # sliders D1-D4 + notas + decisao
├── hooks/
│   └── useRedacaoRevisao.ts
└── ...

supabase/functions/avaliar-redacao/
├── index.ts                                # Edge Function principal
└── _local/
    ├── compute-score.ts                    # computeScoreAndCors + normalizeForHash
    └── render-prompt.ts

supabase/functions/submit-redacao/          # NOVA (anti-tampering + hash)
├── index.ts                                # POST do candidato → INSERT redacoes_candidato + trigger avaliar-redacao
└── _local/

supabase/functions/_shared/
├── prompts/avaliar-redacao.ts              # template 06 v1.0 + 3 few-shot inline
├── zod-schemas/essay-scoring.ts            # EssayScoringV1Schema
├── rag/fit-cultural.ts                     # filesystem read 4 arquivos + cache
└── audit-logger.ts                         # já existente do M2

supabase/migrations/
├── 14_create_perguntas_redacao.sql
├── 15_seed_perguntas_redacao.sql
├── 16_create_redacoes_candidato_em_progresso.sql
├── 17_create_redacoes_candidato.sql
├── 18_alter_vaga_testes_aplicaveis_redacao.sql
└── 19_redacao_rls_and_trigger.sql           # PL/pgSQL — workaround CLAUDE.md
```

### 8.6 Decisões técnicas-chave

| # | Decisão | Razão | Alternativa rejeitada |
|---|---------|-------|----------------------|
| T-1 | **3 tabelas** (em_progresso + final + banco) replicando padrão Big Five v0.3 | Separa concerns (autosave incremental ≠ registro auditável ≠ catálogo). RLS mais simples. TTL aplicável só em em_progresso. | 1 tabela com state machine via status — funciona mas mistura concerns; harder to TTL |
| T-2 | **BARS pesos iguais 25%** V1 | Sem dados ainda, peso igual é defensável e auditável. Calibrar V2 com Cohen's κ por dimensão. | Pesos chutados por cargo — risco de cementar bias antes de validar |
| T-3 | **Sistema 3 cores threshold** (vs threshold numérico único) | UX RH mais clara — Sara vê cor, prioriza vermelho > amarelo > verde sem aritmética mental. Formaliza caps em uma só métrica visível. | `media ≤ 2.0 OR Dim4 = 1` — válido mas exige RH interpretar 2 regras separadas |
| T-4 | **Hard min 200 / Hard max 500** (sem soft max) | Limites claros pro candidato e pro server. Sem zona cinza. | Soft max 600 — UX ambígua, server bloqueia mesmo assim |
| T-5 | **Sem timer rígido** + cronômetro informativo | Sem detector ChatGPT, timer não tem função técnica. Inclusivo (ansiedade, TDAH, candidatos lentos cuidadosos). Tracking analytics post-hoc. | Timer 30min — exclui candidatos lentos cuidadosos (que tendem a escrever melhor) |
| T-6 | **Few-shot inline cacheado** com 3 exemplos calibrados | Reduz variância scoring 30-40% vs apenas âncoras textuais. Cabe no custo (~R$ 0,01 extra, amortizado por cache hit ≥ 70%). | Sem few-shot — calibração fica 100% nas âncoras; κ alvo difícil bater |
| T-7 | **Hash anti-plágio sha256** intercandidato V1 (sem bloqueio automático) | Cobre 90% dos casos relevantes (paste literal) com custo zero. Flag + revisão humana respeitam autonomia RH. | MinHash/embeddings em V1 — over-engineering pro volume; cabe em V2 |
| T-8 | **UI 1 redação por vez** V1 | Layout focado pra leitura cuidadosa (caso comum: Sara revisa amarelo+vermelho). Comparativo lado-a-lado é tentação UX que vira ruído. | Comparativo lado-a-lado V1 — UX mais difícil sem dados de uso real |
| T-9 | **Banco seedado 12 templates** + sem ad-hoc V1 | Reduz risco de pergunta mal-formulada V1; ad-hoc cabe V2 com diretrizes FAÇA/NÃO-FAÇA já documentadas | Ad-hoc V1 — risco UX + risco de pergunta sem valor primário identificado |
| T-10 | **submit-redacao Edge Function separada** (não INSERT direto) | Anti-tampering (word_count validado server, hash computado server, defensive RLS). Espelha padrão `submit-bigfive-final` v0.3 | INSERT direto via RLS — possível mas perde validação server-side de palavra-chave |

### 8.7 Diagrama de Integração

```
                ┌──────────────────────┐
                │  Candidato (SPA)     │
                │  RedacaoEditor       │
                └──────────┬───────────┘
                           │ autosave 30s
                ┌──────────▼─────────────────────────┐
                │ INSERT/UPDATE                       │
                │ redacoes_candidato_em_progresso     │  (via Supabase client + RLS)
                └─────────────────────────────────────┘

                           │ submit final
                ┌──────────▼─────────────────────────┐
                │ POST /functions/v1/submit-redacao  │
                │  ├─ valida word_count 200-500     │
                │  ├─ computa texto_hash             │
                │  ├─ INSERT redacoes_candidato      │
                │  │   (status='processando')        │
                │  └─ POST avaliar-redacao (síncrono)│
                └──────────┬─────────────────────────┘
                           │
                ┌──────────▼──────────────────────┐
                │ Edge Function avaliar-redacao   │
                │  ├─ Carrega RAG (4 arquivos)    │
                │  ├─ Renderiza prompt v1.0 +     │
                │  │   3 few-shot cacheados       │
                │  ├─ Chama Claude Sonnet 4.6     │
                │  ├─ Valida Zod EssayScoringV1   │
                │  ├─ computeScore + caps + cor   │
                │  ├─ Verifica hash anti-plágio   │
                │  └─ UPDATE → 'pendente_humano'  │
                └──────────┬──────────────────────┘
                           │
                ┌──────────▼──────────────────────┐
                │ RH abre /rh/candidato/:id/redacao│
                │  → sidebar lista pendentes      │
                │  → revisa 1 por vez             │
                │  → override scores, decide      │
                │  → status='concluida'           │
                │  → se 'duvida' → escala gestor  │
                └─────────────────────────────────┘
```

### 8.8 RAG / Knowledge Base

Edge Function consome **4 arquivos curados** em [`docs/conhecimento/fit-cultural/`](../../conhecimento/fit-cultural/):

| Arquivo | Conteúdo | Status |
|---------|----------|--------|
| `valores-beauty-smile-resumo.md` | 4 valores + Ética + sinais positivos/negativos/red flags por valor + pesos por cargo (V2) | ✅ Done |
| `pergunta-padrao-redacao.md` | Q1 padrão BS (Opção B) + 12 templates customizáveis (3 por cargo) com defaults ON/OFF + diretrizes FAÇA/NÃO-FAÇA para V2 ad-hoc | ✅ Done v1.1 |
| `bars-redacao-4-dimensoes.md` | BARS 4D × 5 níveis com âncoras + pesos iguais V1 + 3 caps especiais + bias_audit | ✅ Done v1.1 |
| `exemplos-respostas-bars.md` | 3 redações exemplo (Nível 1 Camila / Nível 3 Rodrigo / Nível 5 Mariana) + scoring justificado por dimensão | ✅ Done v1.1 (sintéticos calibrados) |

Mais cópia do CULTURA-INPUT em [`Cultura-Beauty-Smile-Para-Recrutamento.md`](../../conhecimento/fit-cultural/Cultura-Beauty-Smile-Para-Recrutamento.md).

**Princípios RAG (Master §8.8):**
1. Conhecimento separado do prompt — atualizar valores = editar markdown + PR + deploy
2. Versionamento por arquivo — quebrar BARS = `bars-redacao-4-dimensoes-v2.md` mantendo v1
3. Cold start filesystem read em Edge Function (Deno cache)
4. `cache_control: ephemeral` no system prompt (template + BARS + few-shot) — cache hit ≥ 70% após warmup

---

## 9. Riscos & Mitigações

| # | Risco | Prob. | Impacto | Mitigação | Owner |
|---|-------|-------|---------|-----------|-------|
| 1 | **Few-shot inline aumenta custo além do alvo** | Baixa | Médio | Cache hit ≥ 70% mantém custo médio em alvo; monitoring dispara alerta se cache hit < 50% por > 1 dia | Tech |
| 2 | **Style neutralization falha** (IA penaliza estilo NE/Sul) | Média | Alto (LGPD bias) | Audit mensal de `bias_audit` flags + grupo controle (10 redações estilo regional explícito avaliadas) | RH + Tech |
| 3 | **κ IA × humano < 0,60** (IA não calibrada) | Média | Alto | Piloto 20 redações funcionários atuais ANTES go-live; recalibrar BARS / few-shot / pesos; threshold de bloqueio antes de rollout | Tech |
| 4 | **Volume de "duvida" do RH alto** (gestor afoga) | Média | Médio | Telemetria + alerta se duvida > 30% das redações revisadas; revisar BARS ou treinar RH | RH |
| 5 | **Plágio entre candidatos da MESMA vaga** | Baixa (volume baixo M2 V1) | Médio | Hash exato V1 cobre paste literal; V2 adiciona similaridade aproximada se hash exato perder muito caso | Tech |
| 6 | **Candidato com TEA/dislexia recebe baixo score por estilo** | Baixa | Alto | bias_audit + auditoria operacional; LGPD Art. 20 sempre disponível para revisão humana; treinamento RH | RH (LGPD officer) |
| 7 | **Anthropic API down em volume alto** | Baixa | Médio | Master RF-05 (retry + alerta + revisão manual sem IA) | Tech |
| 8 | **Candidato cola redação de ChatGPT** | Alta | Médio | Sem detecção V1; follow-up ao vivo Etapa 4 (entrevista online) — pergunta sobre detalhes específicos da história narrada | RH |
| 9 | **PRD original (`fit-cultural-prd.md`) confunde leitor sobre escopo** | Alta | Baixo | DEPRECATED header explícito + redirect via README | Fernando |
| 10 | **3 exemplos sintéticos calibram bias específico** (perfis Camila/Rodrigo/Mariana muito homogêneos) | Média | Médio | Auditoria após 50 revisões: variar exemplos V2 com diversidade demográfica + regional explícita; monitorar correlation entre nome/região do candidato real e score | RH |

### 9.1 Pre-mortem (3 cenários)

**Cenário A — "MVP rodou, mas após 6 meses candidatos NE foram eliminados em ratio 3:1 vs Sul":**
- Causa: bias_audit auto-reportado pela IA não foi auditado externamente; regra 4/5 não rodou.
- Mitigação: RNF-R-09 + RNF-R-10 com job mensal documentado + dashboard cor por cargo+região.

**Cenário B — "RH ignora análise IA, marca tudo 'duvida' e gestor fica sobrecarregado":**
- Causa: confiança baixa na IA por experiência ruim do MVP early.
- Mitigação: piloto interno 20-50 redações antes de exposição real + treinamento RH de leitura BARS + few-shot calibrados desde V1 (não esperar V1.1).

**Cenário C — "Mercado descobre que redação BS tem formato STAR e candidatos chegam com redações decoradas":**
- Causa: pergunta padrão fixa + tempo + visibilidade pública do critério.
- Mitigação V1: customizadas por cargo trazem variabilidade entre vagas; follow-up online cobre fabricação detectável. V2: rotação trimestral de pergunta padrão.

---

## 10. Questões em Aberto

| # | Questão | Decisão necessária por | Como decidir |
|---|---------|------------------------|--------------|
| Q-R-01 | submit-redacao via Edge Function separada OU INSERT direto via RLS? | Phase 2 M2 | Recomendação T-10: Edge Function dedicada para hash + word_count server-side. Confirmar no PLAN da Phase 2. |
| Q-R-02 | Trigger DB ou client chama avaliar-redacao após submit? | Phase 2 M2 | Recomendação: client chama síncrono após submit ok (latência aceitável; P95 ≤ 20s). Trigger DB se assíncrono virar necessário em V2. |
| Q-R-03 | "Eliminatorio" é badge vermelho mas não impede candidato de avançar — qual UX exato? | Phase 2 M2 design | Provável: candidato avança naturalmente para Etapa 4 só se nenhuma redação está vermelha; se há vermelha, fica em "aguardando revisão RH" mas pode iniciar outros testes em paralelo |
| Q-R-04 | Se IA retorna `insufficient_evidence` em 4 dimensões (redação muito vaga)? | Já decidido | Status `pendente_humano` + flag `'redacao_vaga'`; RH decide se rejeita ou pede follow-up. NÃO eliminatório automático. |
| Q-R-05 | Re-rodar análise IA sob demanda do RH (ex: prompt foi atualizado)? | V2 | V1: não. V2: sim, com flag `re_avaliada` + audit da v anterior preservado. |
| Q-R-06 | LGPD Art. 18: candidato pode pedir cópia da própria análise IA? | LGPD officer | Sim — endpoint público de explicação (Master RF-32) inclui resumo qualitativo (não scores brutos nem citações específicas) |
| Q-R-07 | Quem aprova mudanças no `06-culture-fit-essay-vN.md`? | Pré go-live | Tech-lead + RH. Decisão registrada no frontmatter do template. |
| Q-R-08 | Pesos por valor por cargo modulando D4 — quando ativar? | V2 com dados | Após 50 redações revisadas, calcular se modulação por cargo melhora κ vs peso igual. Se sim, ativar V2. |

---

## 11. Timeline & Fases

| Fase | Trabalho | Estimativa | Dependências |
|------|----------|------------|--------------|
| **F1 — Knowledge base** | 4 arquivos em `docs/conhecimento/fit-cultural/` (todos done v1.1 nesta sessão) | 0 dias (feito) | — |
| **F2 — Migrations** | 14-19 (5 tabelas + alter testes_aplicaveis + RLS+trigger PL/pgSQL) | 1-2 dias | M2 schema base |
| **F3 — Edge Function avaliar-redacao** | + submit-redacao + Zod + RAG loader + computeScoreAndCors + tests | 3-4 dias | F1 + F2 |
| **F4 — UI candidato** | RedacaoEditor + Counter 3 cores + Cronometro + autosave dupla + SubmitFlow | 2-3 dias | F2 |
| **F5 — UI RH** | RedacaoReviewPanel 1-por-vez + Sidebar cor + OverrideForm + atalhos | 2-3 dias | F2 |
| **F6 — Piloto interno** | 20-50 redações de funcionários atuais BS; medir κ IA × humano por dimensão; calibrar BARS / few-shot se necessário | 1-2 semanas | F3+F4+F5 |
| **F7 — Go-live** | Liberar para vagas reais com monitoring ativo (custo, cache hit, bias_audit) | — | F6 com κ ≥ 0,60 confirmado |

**Total V1: ~10-15 dias úteis dentro da Phase 2-3 do M2.**

---

## 12. Plano de Documentação

| Documento | Mudança |
|-----------|---------|
| Este PRD | v1.1 (revisão de v1.0 com decisões da sessão 2026-05-12) |
| [`PRD-MASTER-funil-rh-m2.md`](./PRD-MASTER-funil-rh-m2.md) | RF-16/17 refinados; §8.2 nova subsection `redacoes_candidato` (apontando aqui); §15 status; §16 changelog v0.4 |
| [`README.md`](./README.md) m2-funil-rh | Status do mini-PRD → v1.1 ✅ Done 2026-05-12 |
| [`docs/prds/fit-cultural-prd.md`](../fit-cultural-prd.md) | Header DEPRECATED reforçado |
| [`docs/conhecimento/fit-cultural/README.md`](../../conhecimento/fit-cultural/README.md) | Atualizar checklist com 4 arquivos done + nota de versão |
| `valores-beauty-smile-resumo.md` | Mantido (revisão pequena: nota de pesos V1 fixo) |
| `pergunta-padrao-redacao.md` | v1.1 — Opção B + 12 templates 3-por-cargo |
| `bars-redacao-4-dimensoes.md` | v1.1 — pesos iguais V1 + 3 caps especiais |
| `exemplos-respostas-bars.md` | v1.1 — 3 exemplos completos (Camila/Rodrigo/Mariana) com scoring justificado |

---

## 13. Histórico de Mudanças

| Versão | Data | Autor | Mudança |
|--------|------|-------|---------|
| 0.0 | (referência) | — | PRD original SJT/Likert/Ranking 25 itens em `../fit-cultural-prd.md` (DEPRECATED) |
| 1.0 | 2026-05-10 | Fernando + Claude | Versão inicial do mini-PRD redação-fit-cultural com 10 decisões refinadas. Pergunta padrão "decisão difícil"; 4 templates default por cargo; BARS pesos por cargo; threshold `media ≤ 2.0 OR Dim4 = 1`; sem few-shot; soft max 600; 1 tabela `redacoes_candidato`; sem anti-plágio V1. |
| **1.1** | **2026-05-12** | **Fernando + Claude** | **Revisão completa em sessão interativa Onda 1-5**: pergunta padrão Opção B (cuidar de pessoa em fragilidade); 12 templates customizáveis 3-por-cargo com defaults ON/OFF (junior=1 / sênior=2); BARS pesos iguais 25% V1; sistema 3 cores threshold (verde ≥65 / amarelo 41-64 / vermelho ≤40 OR red_flag_etico OR D1≤2); 3 caps especiais explícitos; few-shot 3 exemplos inline cacheado (Camila L1 / Rodrigo L3 / Mariana L5); schema 3 tabelas (em_progresso + final + banco) espelhando Big Five v0.3; hard min/max 200-500 sem soft max; hash anti-plágio intercandidato V1 (flag, sem bloqueio); UI 1-redação-por-vez (comparativo V2); submit-redacao Edge Function dedicada anti-tampering. |
