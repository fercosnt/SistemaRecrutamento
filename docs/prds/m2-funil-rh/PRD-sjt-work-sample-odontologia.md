# PRD — SJT / Work Sample customizado por cargo (M2 Funil RH)

**Autor:** Fernando Costa Neto | **Data:** 2026-06-05 | **Status:** Done v1.0
**Nível:** Standard+ (mini-PRD aninhado no Master M2)
**Upstream:** [PESQUISA SJT odontologia](../../conhecimento/sjt/PESQUISA-sjt-odontologia-beauty-smile.md) · [formulários do sistema anterior](../../conhecimento/perguntas-vagas.md) · [PRD-MASTER M2](./PRD-MASTER-funil-rh-m2.md) v0.5 · template [`07-work-sample-sjt`](../../conhecimento/prompts/templates/07-work-sample-sjt.md)
**Refina no Master:** RF-11, RF-13, RF-14, RF-33
**Substitui:** nada (NOVO)

---

## 0. Sumário

Especifica o **Work Sample / SJT** da Etapa 3 (Avaliação Assíncrona) do funil M2 — o componente **eliminatório-com-revisão-humana** que mede julgamento situacional por cargo. Entrega um **banco inicial de 7 cargos** ancorado (a) na pesquisa científica (Webster 2020 r=.32, CFO/DCN) e (b) nos **formulários reais** que a Beauty Smile já usava + seus **4 valores** (Experiência UAU, Inovação, Atitude de Dono, Sede de Crescimento).

**Decisões-chave desta sessão:**
- **Taxonomia de cargos reescrita** a partir dos formulários reais: Dentista, Recepcionista, Consultor de Vendas Premium, SDR/Social Seller, Assistente Financeiro, ASB/TSB (compartilhado), Vaga genérica. Aposentados: "coordenador" e "admin" genéricos da PESQUISA (não são vagas reais). "Higienista" → corrigido para **ASB/TSB** (no Brasil não existe higienista autônoma).
- **Escala graduada 4/2/1/0** (rating com distratores graduados, PESQUISA §3.2) substitui "1 certo + 3 zeros". `fortemente_pontua`=4 · `pontua`=2 · `neutro`=1 · `atencao`=0+flag.
- **Storage Híbrido git→DB** (mesmo padrão da AI Prompt Library): markdown em `docs/conhecimento/sjt/banco-*.md` = source of truth → CI hidrata `perguntas` + `pergunta_opcao_metadata` → runtime lê só o DB.
- **Híbrido de fontes:** SJTs minerados dos formulários reais (cara Beauty Smile) + SJTs CFO da PESQUISA (lastro ético-clínico do dentista/TSB).

---

## 1. Problema & Contexto

> "O sistema anterior tinha formulários longos por cargo (dados + experiência + perguntas situacionais), mas as respostas situacionais não tinham scoring estruturado — o RH lia tudo no olho, sem critério registrado nem comparabilidade entre candidatos. Não dá pra defender uma decisão nem comparar dois candidatos objetivamente." — contexto Beauty Smile

**Evidências:**
- Os formulários reais ([`perguntas-vagas.md`](../../conhecimento/perguntas-vagas.md)) já continham **proto-SJTs** (single-choice com melhor resposta implícita) — ex. dentista "Ao apresentar opções de tratamento, qual abordagem?"; SDR "Como concilia metas de conversão com a melhor solução pro paciente?" — mas sem tags/pesos nem rubric.
- Validade preditiva: SJT em saúde r pooled = **0,32** (Webster et al. 2020) — comparável a entrevista estruturada, baixo adverse impact [PESQUISA §1].
- Composição ótima do funil = Entrevista estruturada + Work Sample + SJT [Master §1.2].
- Brasil é deserto de SJT validado (zero no SATEPSI) → o banco curado vira ativo competitivo [PESQUISA §1.4].

**Contexto de negócio relevante (dos formulários):**
- Beauty Smile = clínica de **laser Fotona LightWalker** (minimamente invasivo), São Paulo (Brigadeiro/Paraíso), **presencial**.
- **NÃO faz harmonização orofacial** → vira **knockout da Etapa 1** (RF-02), não SJT.
- Cultura **premium de venda consultiva** — até o dentista é avaliado por comunicação/persuasão. O eixo ético dominante é **meta comercial × bem-estar do paciente**.
- **4 valores** atravessam todos os cargos.

---

## 2. Objetivos & Métricas

**Métrica primária:** score de Work Sample/SJT correlaciona r ≥ .30 com a decisão final do gestor (medir após n≥30 contratações).

**Secundárias (leading):**
- % de candidatos que concluem o SJT dentro do bloco de Etapa 3 ≥ 80%.
- Tempo médio por bateria dentro do estimado por cargo (5–30min).
- Concordância IA × revisor humano nos cases abertos (kappa ≥ 0.60 no gold standard).

**Guardrail (não podem piorar):**
- **Zero auto-rejeição** por score de SJT (RNF-07a) — toda eliminação passa por revisão humana.
- Adverse impact: selection rate por gênero/raça ≥ 80% do grupo de maior taxa (regra 4/5) — auditável via `bias_audit_log`.
- Bias do scoring de case: `bias_audit.no_demographic_proxies_used = true` em 100% das chamadas.

---

## 3. Escopo

### 3.1 v1 — MVP
- **Banco inicial de 7 cargos** (ver §6) em `docs/conhecimento/sjt/banco-sjt-*.md`.
- **Scoring múltipla escolha** determinístico (Σ pesos) via `pergunta_opcao_metadata`.
- **Scoring de cases abertos / work-sample / in-basket** via Edge Function `avaliar-redacao` reusando template `07-work-sample-sjt` (BARS + inclusion/exclusion).
- **Threshold por cargo** configurável em `vaga.testes_aplicaveis.sjt.threshold` (default: `< 60% do peso máximo OU ≥1 atencao` → revisão).
- **Revisão humana** sempre obrigatória antes de eliminar (MC read-only + case override).
- **Anti-cheat:** randomização da ordem das alternativas + pool>bateria com sorteio + timer suave + cláusula TCLE.
- CI `sync-sjt.ts` hidrata o DB a partir do markdown.

### 3.2 v2
- Expandir cada banco (mais itens → pool maior por cargo, rotação anti-vazamento).
- Workflow **SME-led git-PR** com ciclo de vida de item (draft→piloting→active→retired) + calibração psicométrica (consenso SME, RIT, α).
- Coordenador/Gestor de unidade (se a rede passar a recrutar via funil).
- Animação 3D / mídia rica para reduzir adverse impact (PESQUISA §3.8).
- Plágio entre candidatos (MinHash).

### 3.3 Fora do escopo
- **Proctoring hostil** (câmera/lockdown Mettl-style) — atrito + viés; Master desencoraja.
- **Detector de ChatGPT** — <80% confiável; mitigação = follow-up ao vivo na Etapa 4 (consistente com RF-17b).
- **Banco completo (3-5 itens por cargo) no MVP** — começa enxuto, cresce em v2 (Master §3b).
- **Feedback/devolutiva de SJT ao candidato** — eliminatório expõe critério (RF-19b).

---

## 4. Personas

- **Candidato:** faz a bateria de SJT do cargo dentro do bloco de 60min da Etapa 3.
- **Revisor RH (Sara):** revisa o scoring por candidato, faz override em cases, decide aprovado/reprovado/dúvida.
- **Gestor de clínica:** recebe casos em "dúvida" escalados.
- **SME (psi CRP / dentista responsável):** cria/cura itens em v2 (workflow git-PR).

---

## 5. Requisitos Funcionais

| ID | Requisito | Critério de Aceite | Prioridade |
|----|-----------|--------------------|------------|
| RF-SJT-01 | Banco de SJT por cargo em markdown versionado (`banco-sjt-<cargo>.md`) com frontmatter (cargo, formato, bateria, peso_max, corte_revisao, escala) | 7 bancos presentes e parseáveis | Must |
| RF-SJT-02 | CI `sync-sjt.ts` hidrata `perguntas` (tipo='sjt') + `pergunta_opcao_metadata` (tag/peso/nota_ia) a partir do markdown; runtime lê só o DB | UPSERT idempotente por `content_hash`; `supabase db push` up-to-date | Must |
| RF-SJT-03 | Scoring múltipla escolha = Σ peso(opção marcada), determinístico, sem IA | `score_sjt` gravado em `scores_candidato` (tipo='sjt'); reprodutível | Must |
| RF-SJT-04 | Cases abertos / work-sample / in-basket avaliados por `avaliar-redacao` com template `07-work-sample-sjt` (BARS 0-25 + inclusion/exclusion + Cite Before You Speak) | Output Zod-validado; persistido com audit (prompt_version, model_version, input_hash, cost_tokens) | Must |
| RF-SJT-05 | Threshold por cargo configurável em `vaga.testes_aplicaveis.sjt.threshold`; default `< 60% do peso máx OU ≥1 atencao` (MC) e `< 13/25 OU red flag` (case) → fila de revisão humana | Nunca grava rejeição automática; sempre `status='pendente_humano'` | Must |
| RF-SJT-06 | `tag='atencao'` em qualquer opção marcada força flag de revisão (independe do score total) | Candidato com ≥1 atencao aparece flagged na tela de revisão | Must |
| RF-SJT-07 | Anti-cheat: ordem das alternativas randomizada por candidato; quando banco do cargo > bateria, sortear itens; timer suave (mostra, não reprova); cláusula TCLE anti-compartilhamento | Ordem persiste por sessão (re-render estável); itens sorteados registrados | Must |
| RF-SJT-08 | UX: tempo estimado visível (não countdown agressivo); navegação/revisão entre questões DENTRO do SJT; sem voltar após enviar o bloco; **sem feedback de acerto** | Autosave herdado da Etapa 3 (RF-18); bloqueio de back pós-envio | Must |
| RF-SJT-09 | Tela de revisão RH: por candidato, mostra cada cenário + opção marcada + tag + peso + total MC (read-only) e, para cases, BARS da IA com citações (overridável por slider); registra `decisao_revisor` (aprovado/reprovado/duvida) | MC não editável; case override grava `scores_humanos`; "dúvida" escala ao gestor | Must |
| RF-SJT-10 | Knockout "não realizamos harmonização orofacial" pertence à Etapa 1 (RF-02), não ao SJT | Pergunta marcada tag='knockout' no form de inscrição do dentista | Must |
| RF-SJT-11 | Banco ASB/TSB compartilhado (1 arquivo, 2 cargos) referenciado por ambos os templates de vaga | `vaga.testes_aplicaveis` de asb e tsb apontam pro mesmo banco | Should |
| RF-SJT-12 | v2: workflow SME-led git-PR com ciclo de vida do item (draft/piloting/active/retired) + calibração | Especificado; não implementado no MVP | Could |

---

## 6. Banco inicial — 7 cargos

| Cargo | Formato | Composição | Tempo | Banco |
|-------|---------|------------|-------|-------|
| Dentista | Híbrido | 3 MC (CFO) + case "Mariana" | ~30min | [`banco-sjt-dentista.md`](../../conhecimento/sjt/banco-sjt-dentista.md) |
| Recepcionista | Múltipla escolha | 5 MC | ~12min | [`banco-sjt-recepcao.md`](../../conhecimento/sjt/banco-sjt-recepcao.md) |
| Consultor de Vendas Premium | Híbrido | 3 MC + case "Renata" | ~24min | [`banco-sjt-consultor-vendas.md`](../../conhecimento/sjt/banco-sjt-consultor-vendas.md) |
| SDR / Social Seller | Híbrido | 3 MC + work-sample WhatsApp | ~15min | [`banco-sjt-sdr-social-seller.md`](../../conhecimento/sjt/banco-sjt-sdr-social-seller.md) |
| Assistente Financeiro | Híbrido | 3 MC + in-basket curto | ~23min | [`banco-sjt-assistente-financeiro.md`](../../conhecimento/sjt/banco-sjt-assistente-financeiro.md) |
| ASB / TSB | Múltipla escolha | 2 MC (compartilhado) | ~5min | [`banco-sjt-asb-tsb.md`](../../conhecimento/sjt/banco-sjt-asb-tsb.md) |
| Vaga genérica | Múltipla escolha | 3 MC (4 valores) | ~7min | [`banco-sjt-vaga-generica.md`](../../conhecimento/sjt/banco-sjt-vaga-generica.md) |

Rubrics BARS reutilizáveis + 10 dimensões clínicas: [`bars-rubrics-por-dimensao.md`](../../conhecimento/sjt/bars-rubrics-por-dimensao.md).

**Escala (todos os MC):** `fortemente_pontua`=4 (âncora) · `pontua`=2 (defensável, incompleto) · `neutro`=1 (meio-termo fraco) · `atencao`=0 **+ flag** (erro/red flag).

---

## 7. Requisitos Não-Funcionais

| ID | Categoria | Requisito |
|----|-----------|-----------|
| RNF-SJT-01 | Compliance | Nunca auto-rejeita por score (RNF-07a herdado); toda eliminação passa por revisão humana. |
| RNF-SJT-02 | Anti-bias | Scoring de case ignora estilo/regionalismo/erros leves; `bias_audit` no output (template 07). |
| RNF-SJT-03 | Auditoria | Toda chamada IA logada (prompt_version, model_version, input_hash, cost_tokens) — `ai_call_logs`. |
| RNF-SJT-04 | Idioma de produto | "Avaliação situacional/comportamental", nunca "teste psicológico" (RNF-12). |
| RNF-SJT-05 | Reprodutibilidade | Scoring MC determinístico; mesmo conjunto de respostas → mesmo score. |
| RNF-SJT-06 | Custo | Case aberto reusa `avaliar-redacao` (Sonnet 4.6, ~R$ 0,02/call) — dentro do RNF-10. |

---

## 8. Considerações Técnicas

### 8.1 Storage — Híbrido git→DB
Mesmo padrão da AI Prompt Library (memory [[feedback_versioning_pattern]]). Markdown = source of truth (diff/blame/PR LGPD-compliant); CI `scripts/sync-sjt.ts` calcula `content_hash` e faz UPSERT; **runtime consulta só o DB**. Filename **sem** suffix `-vN` (histórico em git log + DB). Descartado o repo separado `sjt-item-bank/` da PESQUISA §7.

### 8.2 Schema (reusa tabelas existentes do Master §8.2)
- **`perguntas`** — 1 row por SJT: `tipo='sjt'`, `cargo`, `dimensao_primaria`, `cenario` (text), `formato` (mc|case_aberto|work_sample|in_basket), `fonte`, `tempo_est_min`, `status` (draft|piloting|active|retired), `content_hash`.
- **`pergunta_opcao_metadata`** (já existe) — 1 row por alternativa: `opcao_texto`, `tag` (enum), `peso` (int), `nota_ia`, `ordem`.
- **`vaga.testes_aplicaveis`** jsonb estende com: `{ tipo:'sjt', cargo, itens_ids:[], bateria_size, threshold:{ mc_min_pct:60, case_min:13, flag_on_atencao:true } }`.
- **`scores_candidato`** (já existe) — `tipo='sjt'`; `metadata jsonb`: `{ mc: {score, max, respostas:[{pergunta_id, opcao_id, tag, peso}], flags:[]}, cases: [{pergunta_id, bars:{...}, score_0_25, scores_humanos?, red_flags:[]}], status:'pendente_humano'|'concluida', decisao_revisor? }`.

> **Atenção workaround CLAUDE.md:** migration que crie função/trigger PL/pgSQL (ex. validação de soma de pesos) pode falhar via `db push` por SQLSTATE 42601 → SQL Editor manual + `migration repair`.

### 8.3 Scoring
- **MC:** Edge Function (ou trigger) calcula `Σ peso(opção marcada)`; determinístico; grava em `scores_candidato`. Marca `flag` se alguma opção tem `tag='atencao'`.
- **Case/work-sample/in-basket:** `avaliar-redacao` com `rubric_id` do case → template `07-work-sample-sjt` (BARS 0-25, inclusion/exclusion, Cite Before You Speak, anti-bias). Output Zod-validado.

### 8.4 Anti-cheat (RF-SJT-07)
- Ordem das alternativas randomizada por candidato (seed por candidatura, estável no re-render).
- Quando `bateria_size < count(itens do cargo)`, sortear `bateria_size` itens (pool>bateria).
- Timer suave por bloco (telemetria; não reprova por estouro).
- Cláusula anti-compartilhamento no TCLE da Etapa 3.

### 8.5 Deep module
`avaliar-redacao` + template `07-work-sample-sjt` é o **deep module**: interface simples (`{texto, rubric_id}` → `{scores, citações, recommendation}`) encapsulando toda a complexidade de BARS/inclusion-exclusion/anti-bias. Reusado por redação fit-cultural E por todos os cases de SJT — sem duplicação.

### 8.6 Testing decisions
- **MC scoring:** teste unitário determinístico (fixture de respostas → score esperado) — modelo: testes de scoring do Big Five (Δ exato).
- **Sync CI:** teste que markdown → rows de DB bate (count + content_hash).
- **Case scoring:** gold standard n≥10 perfis sintéticos por case, kappa IA×humano ≥ 0.60 (mesmo padrão da AI Prompt Library).
- Prior art: `supabase/functions/_shared/schemas/*` (Zod) + cross-check pattern do Big Five.

---

## 9. Riscos & Mitigações

| # | Risco | Prob | Impacto | Mitigação |
|---|-------|------|---------|-----------|
| 1 | Banco pequeno → vazamento de itens | Média | Médio | pool>bateria + rotação + randomização + TCLE; expandir em v2 |
| 2 | IA pontua mal case de candidato com escrita não-formal | Média | Médio | anti-bias no template 07; revisão humana sempre; bias_audit |
| 3 | SJTs minerados sem lastro científico podem ser contestados | Baixa | Médio | cargos clínicos mantêm âncora CFO/DCN; cases comportamentais ancorados nos 4 valores documentados |
| 4 | Adverse impact por gênero (mulheres pontuam + em SJT) | Média | Baixo | esperado e documentável; bias audit mensal |
| 5 | RH não usa a tela de revisão direito (aprova no automático) | Média | Alto | UI 1 candidato/vez; treinamento; "dúvida" escala ao gestor |

---

## 10. Questões em Aberto

| # | Questão | Responsável | Status |
|---|---------|-------------|--------|
| 1 | `bateria_size` por cargo quando o banco crescer em v2 (quantos sortear?) | Fernando + Sara | Aberta (v2) |
| 2 | ~~Quem são os SMEs por cargo pra calibração (consultor/SDR/financeiro não têm âncora CFO)?~~ | Fernando | **Resolvida** — protocolo em [`protocolo-calibracao-sme.md`](../../conhecimento/sjt/protocolo-calibracao-sme.md): clínicos ancoram em CFO/DCN; comerciais ancoram em **top performers internos + 4 valores** (veto do dono da cultura contra oversell). 3 camadas: face-validity de painel (pré go-live) → known-groups com o time (1º mês) → preditiva (pós n≥20-30). |
| 3 | ~~Beauty Smile recruta ASB/TSB por esse funil hoje?~~ | Fernando | **Resolvida (2026-06-05) — Sim.** Banco compartilhado `banco-sjt-asb-tsb.md` ativo. |
| 4 | n mínimo de calibração antes de um item sair de `piloting` → `active` | Fernando | Aberta (v2) |
| 5 | O timer suave deve ter algum limite duro (ex. encerra o bloco em 2× o estimado)? | Sara + Tech | Aberta |

---

## 11. Histórico

| Versão | Data | Mudança |
|--------|------|---------|
| 1.0 | 2026-06-05 | Versão inicial. Taxonomia de cargos reescrita a partir dos formulários reais (`perguntas-vagas.md`); escala graduada 4/2/1/0; storage Híbrido git→DB; 7 bancos + bars-rubrics depositados; híbrido fontes (CFO + formulários BS). ASB/TSB corrige "higienista"; coordenador/admin genéricos aposentados; +Consultor Vendas Premium, +SDR/Social Seller, +Assistente Financeiro, +Vaga genérica. |
