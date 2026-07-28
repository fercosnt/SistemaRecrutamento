# Cognitivo — Avaliação de Raciocínio Lógico — Mini-PRD (M2 Funil RH)

**Autor**: Fernando Costa + Claude | **Data**: 2026-06-05 | **Status**: Draft
**Nível**: Standard
**Upstream**: [PESQUISA] `docs/conhecimento/icar60/PESQUISA-icar60-cognitivo.md` (Deep Research #1) · `docs/conhecimento/icar60/fontes/alternativas-icar60-testes-cognitivos-brasil.md`
**Parent**: `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` (§6.5 RF-26/27, §8.2 `scores_candidato`)
**Supersede**: substitui o planejado `PRD-icar60-cognitivo.md` (ICAR60 descartado — ver §1) e o `docs/prds/cognitivo-icar-prd.md` (legado). Aposenta `docs/prds/raven-onboarding-prd.md`.

> **Resumo de uma linha:** avaliação de **raciocínio lógico** (matrizes + séries letra-número, itens CC0) aplicada **online com proctoring leve** na Etapa 3, **contextual e nunca eliminatória**, posicionada como **prova técnica não-psicológica** (fora do escopo SATEPSI/CFP), reusando o shell de UI já existente.

---

## 1. Problema & Contexto

### 1.1 A dor

O funil RH (M2) precisa de um sinal de **capacidade de raciocínio** que ajude o gestor a interpretar finalistas — especialmente para cargos clínicos/administrativos onde resolver problemas novos sob pressão importa. O instrumento originalmente lockado para esse slot era o **ICAR60** (substituindo o Raven, já descartado).

### 1.2 Por que o ICAR60 morreu (decisão de viabilidade, 2026-06-05)

A Deep Research #1 é categórica: **"Não use ICAR60 em produção comercial no Brasil."** Quatro bloqueios concorrentes, nenhum contornável pela aplicação presencial:

| # | Bloqueio | Evidência |
|---|----------|-----------|
| 1 | Licença **"non-commercial research"** | Condon & Revelle (2014); site recusa pedidos comerciais [PESQUISA §2.2] |
| 2 | **Zero validação PT-BR** | 0 papers em SciELO/BDTD/PePSIC/PubMed/ResearchGate [PESQUISA §1.1] |
| 3 | **Fora do SATEPSI** | CFP 31/2022 + Lei 4.119/62: instrumento psicológico em seleção sem ser SATEPSI-favorável = contravenção penal [PESQUISA §6.1] |
| 4 | **Sem normas BR** | Só normas SAPA (78% EUA, online auto-selecionado) — cut score arbitrário, indefensável em litígio [PESQUISA §3.3] |

O **desenho de funil** que o Fernando lockou (contextual, opt-in, RF-27 override) está correto. O problema era só o **instrumento dentro do slot**.

### 1.3 A virada — o slot sobrevive como prova técnica não-psicológica

Três fatos reabriram o caminho sem desmontar o desenho:

1. **O papel é contextual, não eliminatório** → o score nunca dispara decisão automatizada adversa, o que esvazia os gatilhos de LGPD Art. 20 e Lei 9.029 (o risco mora na *decisão*, não no sinal).
2. **Existe um shell de UI pronto** (`TesteRavenPage.tsx` + rotas + página de instruções) — frontend glass Beauty Smile com navegação item-a-item, progresso e grid de opções. As imagens Raven (copyright Pearson) **já foram deletadas** do working tree.
3. **Itens de matriz em CC0 real existem** (dataset ICAR do Harvard Dataverse, MaRs-IB) — legalmente reusáveis, sem o problema de licença do ICAR-as-instrument.

Reposicionando como **prova técnica de raciocínio lógico** (terminologia não-psicológica, RNF-12) — análoga a um teste de lógica de emprego, não a um teste psicológico — o instrumento sai da jurisdição SATEPSI/CFP. **Não exige psicólogo** para este componente (diferente do Big Five, que tem CRP-RT).

### 1.4 Decisões travadas nesta sessão

| Decisão | Valor | Origem |
|---------|-------|--------|
| Instrumento | Prova técnica de raciocínio lógico (não-psicológica) | Sessão 2026-06-05 |
| Item bank | **Matrizes + séries letra-número** (CC0) | Sessão 2026-06-05 |
| Modo de aplicação | **Online com proctoring leve** (não mais presencial) | Sessão 2026-06-05 |
| Reuso | Shell de UI existente (`TesteRavenPage.tsx`) portado p/ `avaliacao-assincrona/` | Sessão 2026-06-05 |
| Papel no funil | **Contextual, nunca eliminatório** (RF-27 mantido) | Master (lock anterior) |
| Opt-in | `vaga.aplica_cognitivo` boolean, default false | Master (lock anterior) |

---

## 2. Objetivos & Métricas

### 2.1 Métrica primária
**Adoção útil sem virar filtro:** ≥ 60% das vagas opt-in (`aplica_cognitivo=true`) têm o score do cognitivo **citado na decisão final como contexto** (não como motivo único). Fonte: `decisao_final.dashboard_json` cruzado com `scores_candidato`.

### 2.2 Métricas secundárias
- % de conclusão da prova entre convocados ≥ 75% (3 meses) — proxy de UX aceitável online.
- Tempo mediano de conclusão entre 18–28 min (alvo de design: ~25 min).
- Taxa de flag de proctoring (tab-switch/fullscreen-exit) < 15% das sessões — acima disso, anti-cheat está hostil demais ou há fraude sistêmica.

### 2.3 Guardrails (não-violáveis)
- **Adverse impact:** auditoria trimestral estilo 4/5 (adaptada à Lei 9.029) por gênero/raça/escolaridade. Razão de seleção do grupo minoritário ≥ 80% do majoritário, OU justificativa documentada + banding revisado.
- **Zero rejeição por score isolado:** 0 rejeições onde o motivo cita o cognitivo sem outra evidência (RF-27). Auditoria SQL mensal — qualquer ocorrência = bug bloqueante.
- **Zero terminologia psicológica:** grep de CI por strings proibidas ("teste psicológico", "QI", "inteligência", "cognição", "aptidão") em UI/devolutiva = 0 (RNF-12).

---

## 3. Escopo

### 3.1 v1 (este PRD)
- Item bank curado: matrizes (ICAR Matrix Reasoning + MaRs-IB) + séries letra-número (ICAR Letter-Number), todos CC0, ~25–30 itens.
- Aplicação online com proctoring leve (fullscreen, visibility API, timer, shuffle, 1 tentativa).
- Scoring server-side (CTT, soma simples) com re-scoring anti-tampering.
- Persistência em `scores_candidato` tipo `raciocinio_logico`.
- Apresentação ao gestor em **banda qualitativa** (5 faixas), nunca percentil-contra-população.
- Badge "contextual — não é filtro" no painel e no comparativo (Etapa 6).
- RF-27: bloqueio de rejeição por score isolado com justificativa expandida.
- Bias audit log + flag demográfico.

### 3.2 v2 (futuro)
- Norma local própria construída a partir do pool de candidatos (N ≥ 200) → banding calibrado.
- Validação criterial (correlação score × desempenho 6–12 meses pós-contratação).
- IRT 2PL opcional para calibração fina de itens (CTT é suficiente em v1).
- Item bank adaptativo (CAT) para reduzir tempo.

### 3.3 Fora do Escopo (OBRIGATÓRIO)

| Item | Por quê fora | Futuro |
|------|--------------|--------|
| **ICAR60 como instrumento** | Licença non-commercial + fora SATEPSI + sem normas BR (§1.2) | Nunca — só itens CC0 avulsos do dataset, não o instrumento |
| **Subescala verbal** | Adverse impact ALTO (d 0,8–1,0+) + tradução PT-BR custosa; pesquisa desaconselha p/ recepção/auxiliar [PESQUISA §2.3] | Nunca neste contexto |
| **Rotação 3D** | Cobertura adicional baixa p/ cargos-alvo; requer assets pesados | v3 se houver cargo técnico-espacial |
| **Percentil contra população / "QI"** | Posicionamento não-psicológico (RNF-12); sem normas BR defensáveis | Nunca — banda qualitativa só |
| **Score como critério eliminatório** | RNF-07a + RF-27; papel é contextual | Nunca |
| **Aplicação presencial** | Lock revogado nesta sessão — online recupera automação | Presencial vira fallback manual se proctoring falhar reiteradamente |
| **Psicólogo CRP como RT deste módulo** | Não é teste psicológico; CRP-RT do projeto é só p/ Big Five | Reabrir só se reposicionamento jurídico mudar |
| **Onboarding cognitivo pós-contratação** | Escopo do `raven-onboarding-prd.md` (deprecated) — outro produto | Reavaliar em milestone de desenvolvimento de pessoas |

---

## 4. Personas & Casos de Uso

- **Candidato finalista** (mobile/desktop, público): recebe convite na Etapa 3, faz a prova online em ambiente com proctoring leve, ~25min, sem ver score cru isolado.
- **RH** (desktop, interno): vê banda qualitativa no painel do candidato, marcada como contextual; usa como um sinal entre vários.
- **Gestor** (desktop, interno): no comparativo (Etapa 6), enxerga a banda ao lado de outros sinais; se quiser rejeitar citando o cognitivo, o sistema exige justificativa expandida (RF-27).
- **Admin/DPO** (desktop): acessa `bias_audit_log`, roda auditoria trimestral de adverse impact.

---

## 5. Epic Hypotheses

- **H1 (utilidade contextual):** Se apresentarmos raciocínio como **banda qualitativa contextual** (em vez de número cru), então gestores usarão o sinal para enriquecer a decisão sem transformá-lo em filtro — medível por % de decisões que citam cognitivo como contexto vs. como motivo único.
- **H2 (online é seguro o bastante):** Se aplicarmos online com proctoring leve + shuffle + 1 tentativa, então a taxa de fraude detectável fica baixa o suficiente (flag < 15%) para dispensar a aplicação presencial — *tiny act of discovery:* medir correlação entre tempo-por-item suspeito e flags nas primeiras 50 sessões.
- **H3 (adverse impact contido):** Se usarmos só itens não-verbais (matriz + letra-número) com banding, então a razão de seleção entre grupos demográficos fica ≥ 0,8 — validável na primeira auditoria trimestral.

---

## 6. Requisitos Funcionais

> Refina RF-26/27 do Master. **Mudança-chave vs. Master atual:** `presencial` → `online com proctoring leve`; `tipo='icar60'` → `tipo='raciocinio_logico'`.

| ID | Requisito | Critério de aceite (verificável) | MoSCoW |
|----|-----------|----------------------------------|--------|
| RF-26 (rev) | Prova de raciocínio lógico aplicável **online** para vagas com `vaga.aplica_cognitivo=true` (default false; opt-in) | Vaga com flag false → candidato nunca vê o convite. Flag true → convite aparece na Etapa 3. Teste e2e cobre ambos | Must |
| RF-26a | Item bank: matrizes + séries letra-número, itens CC0, ordem e alternativas embaralhadas por candidato (Fisher-Yates) | Dois candidatos recebem ordens diferentes; gabarito acompanha o shuffle; snapshot test do embaralhamento determinístico por seed | Must |
| RF-26b | Proctoring leve: fullscreen forçado, flag em tab-switch (visibility API), 1 tentativa por candidatura, timer total | Sair do fullscreen ou trocar de aba grava flag em `metadata.flags`; 2ª tentativa é bloqueada; timeout faz auto-submit | Must |
| RF-26c | Scoring **server-side** (CTT, soma 0/1) com re-scoring anti-tampering; subscores por seção + total | `submit-cognitivo-final` recomputa do `raw_responses` ignorando qualquer score vindo do client; fixture de 10 perfis sintéticos valida soma | Must |
| RF-26d | Resultado ao gestor em **banda qualitativa** (5 faixas), **marcado como CONTEXTUAL** ("usar como informação adicional, não como filtro"); **sem** percentil cru, sem "QI" | UI mostra só a banda + badge contextual; grep de CI não acha termos proibidos (RNF-12); nenhum endpoint expõe percentil populacional | Must |
| RF-27 (mantido) | Sistema bloqueia rejeição com base no score de raciocínio isolado (override exige justificativa expandida) | `consolidar-decisao-final`: se motivo da rejeição cita o cognitivo sem outra evidência, exige confirmação extra + grava em `bias_audit_log` | Must |
| RF-26e | Autosave incremental (pausar/retomar) via tabela de progresso | Resposta gravada a cada item; reload retoma do ponto; row de progresso some após submit final | Should |
| RF-26f | Bias audit: flag demográfico + log de toda rejeição que cite o cognitivo | `bias_audit_log` recebe row com candidatura, banda, motivo, flag demográfico; query de auditoria trimestral documentada | Must |
| RF-26g | Devolutiva ao candidato (opcional, não-ansiogênica): texto qualitativo de raciocínio sem número, gerado por template | Candidato vê narrativa de faixa sem score numérico; proibido diagnóstico/comparação | Could |

---

## 7. Requisitos Não-Funcionais

| ID | Requisito | Alvo |
|----|-----------|------|
| RNF-C1 | Latência do submit + scoring server-side | p95 < 3s |
| RNF-C2 | Proctoring não bloqueia conclusão legítima (acessibilidade) | Fullscreen com fallback informado; sem dependência de webcam |
| RNF-C3 | Itens servidos de bucket próprio com licença CC0 commitada junto | `LICENSE-CC0.md` + atribuição no bucket e README |
| RNF-12 (herdado) | Linguagem "avaliação de raciocínio" — NUNCA "teste psicológico/cognitivo/QI" | Grep de CI por strings proibidas = 0 |
| RNF-C4 | Custo por aplicação | ~R$ 0 (sem IA no scoring; devolutiva opcional via template, sem LLM em v1) |

---

## 8. Considerações Técnicas (AI-ready)

### 8.1 Posição no funil
Move de **Etapa 5 (presencial)** → **Etapa 3 (avaliação assíncrona online)**, ao lado de SJT e Big Five. Feature folder: `src/features/avaliacao-assincrona/` (o shell `TesteRavenPage.tsx` é portado para cá como `RaciocinioLogicoQuestionario.tsx`).

### 8.2 Deep module — o motor de scoring
Encapsular toda a complexidade (gabarito, shuffle reverso, soma por seção, banding) atrás de uma interface simples e estável:

```ts
// supabase/functions/_shared/cognitivo/scoring.ts  [interface pública estável]
scoreRaciocinio(rawResponses: Record<itemId, optionIndex>, itemBankVersion: string)
  → { total: number, secoes: { matriz: number, letra_numero: number }, banda: Banda, flags: string[] }
```

O client nunca pontua; manda só `raw_responses`. `submit-cognitivo-final` recomputa server-side (anti-tampering), idêntico ao padrão `submit-bigfive-final`.

### 8.3 Schema — `scores_candidato` (agnóstico, reuso)

Novo valor de enum: `tipo='raciocinio_logico'`. `metadata jsonb` shape (validado por Zod em `supabase/functions/_shared/schemas/cognitivo-scores.ts`):

```json
{
  "instrumento": "raciocinio_logico_cc0",
  "versao_item_bank": "v1",
  "fontes_itens": ["icar_matrix_reasoning", "icar_letter_number", "mars_ib"],
  "lingua": "pt-br",
  "raw_responses": {"item_01": 3, "item_02": 5, "...": "..."},
  "shuffle_seed": "candidatura_uuid",
  "secoes": { "matriz": {"raw", "n_itens"}, "letra_numero": {"raw", "n_itens"} },
  "score_total_raw": 21,
  "banda": "acima_da_media",
  "norm_ref": "provisoria_item_difficulty_sapa",   // v1; trocada por norma local em v2
  "completion_time_seconds": 1490,
  "iniciado_em": "2026-06-05T14:30:00Z",
  "completou_em": "2026-06-05T14:55:00Z",
  "flags": ["tab_switch_x2"]
}
```

Banda enum (snake_case pt-BR, 5 faixas): `'bem_abaixo' | 'abaixo' | 'na_media' | 'acima' | 'bem_acima'`.

Tabela de progresso (autosave), espelhando `bigfive_respostas_em_progresso`:

```
cognitivo_respostas_em_progresso
  candidatura_id uuid UNIQUE FK, respostas jsonb, shuffle_seed text,
  iniciado_em, ultima_atividade_em, completou_em, user_agent
  Index: idx_cognitivo_progresso_candidatura. RLS: candidato R/W própria; RH/admin R; cron TTL pós-anonimização.
```

### 8.4 Edge Functions

| Função | Trigger | Input | Output | IA |
|--------|---------|-------|--------|----|
| `submit-cognitivo-final` (NOVO) | HTTP POST do candidato ao "Concluir" | `{candidatura_id, raw_responses, shuffle_seed, client_timings}` | re-scoring server-side (CTT) → grava `scores_candidato` tipo `raciocinio_logico` → retorna `{score_id, banda}` | sem IA |
| `cognitivo-devolutiva` (opcional, Could) | chamada interna pós-submit | `{score_id}` | narrativa qualitativa por template (sem número) → `devolutivas_candidato` | sem IA em v1 (template estático) |

`consolidar-decisao-final` (já existente) ganha a regra RF-27 para o novo `tipo`.

### 8.5 Item bank — sourcing & licença
- **Matrizes:** ICAR Matrix Reasoning (dataset CC0 Harvard Dataverse `doi:10.7910/DVN/TZJGAT`) + MaRs-IB (OSF `osf.io/g96f4`, contatar autores p/ uso — flexíveis).
- **Letra-número:** ICAR Letter-Number Series (mesmo dataset CC0).
- **Gabarito:** `superKey60` do dataset SAPA (CC0).
- **Importante:** usar **apenas** o dataset CC0 (sem restrição comercial), não o item bank do icar-project.com (non-commercial). Assets servidos de bucket próprio `cognitivo-itens` com `LICENSE-CC0.md` commitado.
- **Modelo de item muda vs. shell atual:** o shell renderiza 1 imagem composta por item (formato Raven); itens CC0 vêm como enunciado + alternativas discretas. Adaptar `QuestaoRaven` → `ItemRaciocinio { id, secao, enunciado_img, alternativas_img[], gabarito_idx }`.

### 8.6 Anti-cheat (proctoring leve)
Visibility API (flag tab-switch) · Fullscreen API forçado · `preventDefault` em copy/paste/right-click · Fisher-Yates shuffle de itens E alternativas (seed = candidatura_id, reproduzível server-side) · auto-submit no timeout · 1 tentativa (constraint UNIQUE candidatura) · logging de tempo por item (suspeito: <500ms ou outlier alto) → tudo em `metadata.flags`, **nunca auto-rejeita** — só sinaliza ao RH.

### 8.7 ADRs respeitados / convenções
- `database.types.ts` regenerado após migration (nunca editar à mão).
- Migration PL/pgSQL: seguir workaround do CLAUDE.md (SQL Editor + `migration repair`) se houver `CREATE FUNCTION`/`DO` com `$$`.
- Schema agnóstico via `metadata.instrumento` = mesmo pattern do Plan B BFI-2 do Big Five.

---

## 9. Testing Decisions

- **Módulos testados:** `scoring.ts` (deep module) — unit tests com fixture de 10 perfis sintéticos (respostas conhecidas → score/banda esperados); teste de shuffle determinístico (mesmo seed → mesma ordem; gabarito acompanha). `submit-cognitivo-final` — teste de anti-tampering (client manda score forjado → ignorado).
- **Definição de "bom teste":** valida **comportamento externo** (entrada `raw_responses` → saída `banda`/`flags`), não a implementação interna do loop de soma.
- **Prior art no codebase:** seguir o cross-check de `submit-bigfive-final` (TS port inline + fixture de perfis sintéticos, Δ tolerado) descrito no Master §8.4 e no `PRD-bigfive-revisado.md`. Espelhar a estrutura de teste do Big Five.
- **e2e (Playwright):** vaga com `aplica_cognitivo=false` → candidato não vê convite; `=true` → fluxo completo até banda no painel RH; tentativa de 2ª submissão bloqueada.

---

## 10. Riscos & Mitigações

| # | Risco | Sev | Mitigação |
|---|-------|-----|-----------|
| 1 | Reposicionamento "prova técnica" ainda ser lido como teste psicológico disfarçado pelo CFP/MPT | Média | Terminologia 100% não-psicológica (RNF-12 + grep CI); papel contextual (RF-27); sem percentil/QI; documentar job-relevance |
| 2 | Itens CC0 circularem online → memorização/fraude | Média | Pool > itens aplicados + shuffle + rotação de subset + 1 tentativa; v2: banco maior + CAT |
| 3 | Banda sem norma local ser arbitrária no início | Média | v1 usa dificuldade-de-item SAPA como referência provisória + banding largo; v2 constrói norma local (N≥200) |
| 4 | Adverse impact mesmo em itens não-verbais (proxy escolaridade BR) | Média-alta | Auditoria trimestral 4/5 + banding + flag demográfico; só não-verbal (menor d que verbal) [PESQUISA §4.4] |
| 5 | Git history ainda conter imagens Raven legadas | Alta (jurídico) | Verificar e, se preciso, `git filter-repo` (raven-onboarding-prd §5.4 / RL-08) — **ação P0 independente deste PRD** |

---

## 11. Questões em Aberto

| ID | Questão | Status | Decisão |
|----|---------|--------|---------|
| Q-C1 | Itens por seção + tempo-alvo | ✅ **Lockado** 2026-06-05 | ~18 matriz + ~10 letra-número, ~25 min total |
| Q-C2 | Devolutiva ao candidato (RF-26g) no v1? | ✅ **Lockado** 2026-06-05 | **Could** — fora do v1, adicionar depois |
| Q-C3 | Rótulos de banda na UI | ✅ **Lockado** 2026-06-05 | "Bem acima / acima / na média / abaixo / bem abaixo da média dos candidatos" |
| Q-C4 | MaRs-IB ou só ICAR CC0? | ✅ **Lockado** 2026-06-05 | **Só ICAR CC0** no v1 (Harvard Dataverse); MaRs-IB = expansão futura |
| Q-C5 | Git history tem imagens Raven? | ✅ **Auditado + decidido** 2026-06-05 | SIM — 60 blobs `.webp` em `backup/local-state-2026-04` (local + `origin`). **Decisão: NÃO rodar `git filter-repo` agora** (repo privado/single-owner → risco real baixo). **Revisitar antes de abrir/publicar o repo ou no go-live.** Independente disso: **não usar essas imagens no build novo — só itens CC0 do Harvard Dataverse** |

---

## 12. Referências
- `docs/conhecimento/icar60/PESQUISA-icar60-cognitivo.md` — viabilidade, scoring CTT, adverse impact, plan B
- `docs/conhecimento/icar60/fontes/alternativas-icar60-testes-cognitivos-brasil.md`
- Dataset CC0: Harvard Dataverse `doi:10.7910/DVN/TZJGAT` (SAPA ICAR, `superKey60`)
- MaRs-IB: OSF `osf.io/g96f4`
- `PRD-MASTER-funil-rh-m2.md` §6.5, §8.2, §8.4 · `PRD-bigfive-revisado.md` (padrão submit-final + cross-check)
- `raven-onboarding-prd.md` (deprecated) · `cognitivo-icar-prd.md` (legado)
