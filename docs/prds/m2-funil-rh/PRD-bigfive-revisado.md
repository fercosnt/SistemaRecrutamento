# PRD — Big Five (revisado V1)

**Autor:** Fernando + Claude (sessão de design 2026-04-28)
**Data:** 2026-04-28
**Status:** Draft pronto pra `/gsd-discuss-phase` quando M2 abrir
**Nível:** Standard
**Substitui:** [`docs/prds/bigfive-prd.md`](../bigfive-prd.md) (legado, DEPRECATED)
**Mestre:** [`PRD-MASTER-funil-rh-m2.md`](./PRD-MASTER-funil-rh-m2.md) (refina RF-15, RF-19a, RF-19b, schema `devolutivas_candidato`, EF `gerar-devolutiva-bigfive`)
**Upstream:**
- Pesquisa #2 — [`docs/conhecimento/big-five/PESQUISA-big-five-ipip-neo-120-ptbr.md`](../../conhecimento/big-five/PESQUISA-big-five-ipip-neo-120-ptbr.md)
- Curso NotebookLM Jordan Peterson Big Five (BFAS) — [notebook 1bdaf389](https://notebooklm.google.com/notebook/1bdaf389-9e7c-498b-81a6-e7aae7506ca5)
- [Report BFAS validado do Fernando](../../conhecimento/big-five/report%20big%20five.pdf) — modelo de qualidade da devolutiva
- 5 Word docs interpretativos PT-BR (`{Abertura,Conscienciosidade,Extroversao,Amabilidade,Neuroticismo}_Big5.docx`)
- Item bank — [`fontes/ipip-neo-120-questions-pt-br.json`](../../conhecimento/big-five/fontes/ipip-neo-120-questions-pt-br.json)

---

## 0. Sumário Executivo

V1 entrega o Big Five como **avaliação assíncrona contextual (não-eliminatória)** na Etapa 3 do funil M2. Instrumento: **IPIP-NEO-120 PT-BR** (item bank em domínio público, scoring open-source documentado). Devolutiva ao candidato segue formato **BFAS-flavored** (5 dimensões + percentil cru + banda em 5 níveis + texto interpretativo ~150-200 palavras por dim) inspirada no [report BFAS validado do Fernando](../../conhecimento/big-five/report%20big%20five.pdf). Geração via **híbrido**: 25 templates oficiais curados + IA personaliza (nome, cargo, percentil exato). Posicionamento legal: "self-assessment de estilo de trabalho" sob responsabilidade técnica de psicólogo CRP ativo já contratado pela empresa. Plan B: **BFI-2 PT-BR** (Pires 2023), schema agnóstico permite pivot em 1-2 dias se IPIP-NEO mostrar problema psicométrico.

---

## 1. Problema & Contexto

### 1.1 Problema central

O Master M2 §6.3 estabelece que a Etapa 3 (Avaliação Assíncrona) deve incluir um **questionário de perfil comportamental** que entregue informação contextual ao gestor de clínica e devolutiva valiosa ao candidato. Big Five é o instrumento certo (literatura organizacional consolidada, recomendado pelo curso de referência do Fernando), mas:

1. **Brasil tem restrição CFP/SATEPSI** específica para "testes psicológicos" — aplicação online sem psicólogo presencial é proibida (Res. CFP 31/2022 + Res. CFP 09/2024). Posicionamento + responsável técnico são obrigatórios.
2. **IPIP-NEO-120 PT-BR não tem validação brasileira formal** — risco psicométrico até validar internamente (n≥300 candidatos = ~6 meses pós-launch).
3. **Devolutiva precisa entregar valor real** — Master v0.2 lockou "qualitativa por dimensão" mas deixou formato exato em aberto. Sem formato definido, EF `gerar-devolutiva-bigfive` não tem contrato.
4. **A decisão lockada original "SEM percentil cru pro candidato"** foi tomada para evitar contestação fria, mas **contradiz o referencial de qualidade do Fernando** (report BFAS do understandmyself.com mostra percentil cru 26 pra Agreeableness, 53 pra Extraversion, etc., e isso funciona bem). Decisão precisa ser reabertA conscientemente.

### 1.2 Evidências

- **Curso NotebookLM:** Jordan Peterson ensina exclusivamente o BFAS via understandmyself.com. Devolutiva é por percentil cru ("segundo percentil para extroversão") + banda qualitativa ("Moderately Low") + texto interpretativo extenso. Recomenda fortemente Big Five + QI pra recrutamento (alta Conscienciosidade + QI pra cargos administrativos; alta Abertura + QI pra criativos).
- **Report BFAS validado do Fernando** (38 páginas, understandmyself.com): cabeçalho com 5 percentis + banda + uma página por dimensão com analogia "1 em 100 pessoas" + texto interpretativo de ~600-800 palavras por dimensão.
- **Pesquisa #2 §6.8:** veredito jurídico explícito — "auto-aplicado, gestor lê resultado, score influencia decisão, sem psicólogo" é juridicamente inviável no Brasil. Caminho viável: psicólogo CRP responsável técnico + reposicionamento como self-assessment + score não-eliminatório documentado.
- **Pesquisa #2 §5:** algoritmo de scoring Johnson 2014 totalmente documentado (reverse-coded items, T-score, percentil aproximação cúbica, normas internacionais embutidas em `five-factor-e` Python e `bigfive-web` TypeScript).

### 1.3 Contexto histórico

PRD legado [`docs/prds/bigfive-prd.md`](../bigfive-prd.md) (pré-pesquisa) já estabelecia Big Five como contextual + assíncrono, mas sem instrumento confirmado, sem scoring algorithm documentado, sem posicionamento legal resolvido, sem formato de devolutiva. Este mini-PRD substitui o legado e fecha esses gaps consumindo Pesquisa #2 + materiais Fernando + curso NotebookLM.

---

## 2. Objetivos & Métricas

### 2.1 Objective (OKR)

> Entregar avaliação Big Five validada + devolutiva de qualidade BFAS-flavored ao candidato, com scoring auditável e posicionamento legal defensável, sem custo de licença e dentro do budget de IA do Master.

### 2.2 Métrica Primária

**Completion rate da aplicação** ≥ 75% (pesquisa #2 §10.3 mín; ideal ≥ 90%).

Mensuração: candidaturas com `bigfive_respostas_em_progresso.completou_em IS NOT NULL` ÷ candidaturas que iniciaram (1ª resposta gravada). Tracking automático via timestamps.

### 2.3 Métricas Secundárias

| ID | Métrica | Threshold | Tracking |
|----|---------|-----------|----------|
| MS-01 | Tempo médio de aplicação | 15-25 min (pesquisa #2 §10.3) | timestamp diff `iniciado_em → completou_em` |
| MS-02 | Latência da geração de devolutiva | P95 ≤ 5s síncrono | log Edge Function `submit-bigfive-final` |
| MS-03 | Taxa de candidatos que abrem a devolutiva (in-app ou email) | ≥ 60% | `devolutivas_candidato.acessado_em IS NOT NULL` |

### 2.4 Métricas Guardrail (NÃO podem piorar)

| ID | Guardrail | Threshold | Ação se quebrado |
|----|-----------|-----------|------------------|
| MG-01 | Custo IA por devolutiva | ≤ R$ 0,03 (Master RNF-10 dá orçamento R$ 0,03 pra Big Five no agregado R$ 0,50/candidato) | Reduz tokens output / cache prompt template |
| MG-02 | Zero auto-rejeição por score Big Five | 0 rows em `decisao_final` que citem Big Five como motivo único | SQL audit mensal; bloqueio em código + UI |
| MG-03 | Zero exibição de percentil cru fora dos canais autorizados | Painel candidato + email + painel CRP/RH apenas. NUNCA log público, métricas agregadas, etc | Code review obrigatório em qualquer mudança de UI; grep CI |

### 2.5 Métricas aspiracionais V2 (NÃO incluir como gate em V1)

- α de Cronbach por dimensão ≥ 0.70 (após n≥100 candidatos) — trigger pro Plan B se < 0.65
- NPS candidato sobre devolutiva ≥ 30
- Taxa de pedido de revisão LGPD Art. 20 ≤ 5% (proxy de qualidade)
- Detecção automática de respostas inválidas ≥ 95% precisão (straight-lining, tempo curto, reverse-code consistency)

---

## 3. Escopo

### 3.1 V1 — MVP M2 (estimativa: 2-3 semanas dentro da Phase 2 do M2)

**Engine + dados:**
- Item bank IPIP-NEO-120 PT-BR carregado de `docs/conhecimento/big-five/fontes/ipip-neo-120-questions-pt-br.json` em runtime da Edge Function (RAG filesystem padrão Master §8.8)
- Scoring engine TypeScript port inline na Edge Function Deno (~150 linhas, baseado em [`bigfive-web`](https://github.com/rubynor/bigfive-web) MIT)
- Cross-check em CI: fixture com 10-20 perfis sintéticos → TS port retorna mesmos T-scores que [`five-factor-e`](https://github.com/NeuroQuestAi/five-factor-e) Python (Δ ≤ 0.01)
- Normas Johnson 2014 internacionais (estratificadas por sexo M/F/N × 4 faixas etárias = 8 grupos; 560 valores embutidos em JSON estático no repo)

**UX da aplicação:**
- 1 item por tela, mobile-first
- Likert 1-5 (escala BFAS adaptada PT-BR: Muito imprecisa / Moderadamente imprecisa / Nem precisa nem imprecisa / Moderadamente precisa / Muito precisa)
- Permite back na sessão atual nos últimos 3-5 itens; bloqueia após sair sessão
- Disclaimer pré-aplicação curado (4 bullets + checkbox aceite + LGPD em modal "Saiba mais")
- Autosave por resposta em `bigfive_respostas_em_progresso`
- Resume on refresh (retoma da última resposta gravada)
- Progress bar visível ("Item 47 de 120")
- Tempo médio anunciado no disclaimer ("~20-25 min")

**Submit + Devolutiva:**
- Endpoint `submit-bigfive-final` valida raw_responses (anti-tampering re-scoring server-side) + grava `scores_candidato` + chama EF `gerar-devolutiva-bigfive` síncrona
- Geração híbrida: 25 templates oficiais em `docs/conhecimento/big-five/templates-devolutiva.md` + IA personaliza com nome/cargo/percentil exato + output validado Zod
- Layout devolutiva: 5 páginas (1 por dimensão) + cabeçalho geral (dashboard 5 percentis + bandas)
- Formato D-lite: 5 dim + percentil cru + banda em 5 níveis (≤15/16-35/36-64/65-84/≥85) + texto ~150-200 palavras por dim
- Nomenclatura PT-BR: "Sensibilidade Emocional" pra Neuroticismo (mantém direção do score, evita conotação patológica); outras 4 dim em tradução acadêmica
- Entrega ambos: in-app imediato + email com link permanente disparado via n8n em ~1min

**LGPD/CFP:**
- Disclaimer "self-assessment de estilo de trabalho" + responsável técnico CRP nominal em toda devolutiva
- TTL: 12 meses pós-fim do processo + anonimização (cron mensal n8n; mantém scores agregados pra normas internas BR futuras, remove PII)
- Endpoint LGPD Art. 20: reusa `lgpd-explicacao-candidato` do Master com flag `?include_bigfive=true`
- Audit completo: `devolutivas_candidato.conteudo_jsonb` salva `template_version, prompt_version, model, raw_response, final_text, palavras_count`

**RNF mensuráveis V1:** completion rate ≥ 75% + tempo médio 15-25 min (ver §6).

### 3.2 V2 (após validação) — estimativa: +4-8 semanas pós-launch

- Devolutiva D-full: 5 dim + 10 aspectos derivados (depende de aparecer paper canônico validando IPIP-NEO 30 facetas → 10 aspectos BFAS, OU de painel interno de psicólogos derivar mapping internamente via piloto)
- Detecção automática de respostas inválidas (straight-lining, tempo curto, reverse-code consistency) com modal não-bloqueante
- Normas internas brasileiras (após n≥300 candidatos)
- Métricas psicométricas (α de Cronbach por dim/faceta) como RNF mensurável
- NPS survey opcional pós-devolutiva
- PDF export da devolutiva (para anexar à candidatura ou enviar pro LinkedIn)

### 3.3 V3 (futuro)

- Pivot pra HEXACO-60 com diferencial Honesty-Humility (pesquisa #2 §7.3) se houver demanda de mercado
- Painel agregado pra RH com distribuição populacional Beauty Smile vs candidatos (após n≥500)
- Publicação acadêmica de validação BR do IPIP-NEO-120 (oportunidade de marketing + ciência)
- Versão BFAS authentic se Beauty Smile virar partner do understandmyself.com

---

## 3b. Fora do Escopo

| Item | Justificativa | Indicação futura |
|---|---|---|
| **BFAS authentic via understandmyself.com white-label** | Vendor lock-in + custo USD ~10/aplicação × volume + sem PT-BR validado. Trade-off perde-perde vs IPIP-NEO-120 + devolutiva BFAS-flavored. | V3 se houver demanda de mercado por "BFAS oficial" |
| **Mapeamento canônico IPIP-NEO 30 facetas → 10 aspectos BFAS (Opção D-full)** | Mapping não documentado em paper peer-reviewed (DeYoung 2007 fatorou AB5C+NEO PI-R, não IPIP-NEO-120). Inferência heurística = score derivado não-canônico = risco psicométrico + dificuldade de defesa CRP. | V2 se aparecer paper, OU se Beauty Smile fizer painel interno de validação |
| **Detecção automática de respostas inválidas** | Adiada pra V2 (Bloco 2 do design). V1 só captura timestamp; CRP detecta inconsistência manualmente quando revisa. | V2 sprint dedicada |
| **Fine-tuning de Claude pra devolutiva** | Volume baixo (centenas/mês inicial) não justifica custo de fine-tuning. Templates + IA híbrido entrega qualidade suficiente. | V3 se volume > 10k/mês |
| **Normas brasileiras formais publicadas em paper** | Exige n≥300 + análise psicométrica formal + revisão por pares. Beneficia produto a longo prazo mas não é blocker pra V1. | V2/V3 (oportunidade científica + marketing) |
| **Métricas psicométricas (α Cronbach) como RNF mensurável V1** | Exige n≥100 candidatos = ~3-6 meses pós-launch. RNF V1 fica nas métricas operacionais. | V2 mensuráveis |
| **NPS survey pós-devolutiva** | V1 prioriza canal funcional + audit; survey adiciona fricção pra candidato. | V2 quando engenharia de retenção entrar |
| **Whisper/transcrição de respostas em áudio** | Big Five é Likert puro; Whisper é pra entrevista. Fora do scope dessa avaliação. | Nunca (não aplicável) |
| **Comparação cross-candidato baseada em Big Five** | Big Five é contextual não-eliminatório; comparação ranking-style violaria papel + arrisca discriminação. RH compara candidatos via outros instrumentos (SJT, Redação, entrevista). | Nunca (constraint do produto) |

---

## 4. Personas & Casos de Uso

### Persona 1: Candidato (Maria, recepcionista, ensino médio completo)

**Contexto:** Recebeu link de candidatura via WhatsApp. Passou pela inscrição (Etapa 1) e triagem RH com IA (Etapa 2). Agora está na Etapa 3 (Avaliação Assíncrona) e vê uma lista de testes pendentes — Work Sample, Big Five, Redação. Quer terminar tudo no fim de semana, no celular.

**Necessidades:**
- Entender o que o teste faz e quanto tempo leva ANTES de começar
- Não ser surpreendida por questões longas ou comparações desconfortáveis
- Receber alguma devolutiva valiosa (não ser "mais uma triagem que some no vácuo")
- Saber que sua resposta tem propósito legítimo (não está sendo usada pra discriminar)

**Casos de uso:**
- UC-01: Inicia o questionário no celular durante intervalo, faz 30 itens, sai do app, retoma de noite, termina os 90 restantes
- UC-02: Conclui e recebe devolutiva instantânea de 5 páginas com seu perfil + email com link permanente
- UC-03: Lê a devolutiva, identifica-se com 3-4 traços, sente que ganhou auto-conhecimento, eventualmente compartilha no WhatsApp com amiga

### Persona 2: Sara (RH, Coordenadora de Recrutamento)

**Contexto:** Já validada em M1/M2. Recebe candidatos em pipeline, abre painel de cada candidato pra triagem. Não tem formação em psicologia.

**Necessidades:**
- Ver o perfil Big Five do candidato como **informação contextual** (não como score eliminatório)
- Entender em 30 segundos se o perfil é "compatível com o cargo" sem precisar virar psicóloga
- Saber que pode acionar o psicólogo CRP responsável se quiser leitura mais profunda

**Casos de uso:**
- UC-04: Abre `/rh/candidato/:id` e vê tab "Big Five" com dashboard de 5 percentis + bandas + texto-resumo de 100 palavras
- UC-05: Para cargos específicos (ex: dentista), vê filtro destacando dimensões mais relevantes (ex: alta Conscienciosidade)
- UC-06: Em caso de dúvida (ex: candidato com Sensibilidade Emocional muito alta pra cargo de atendimento), aciona o psicólogo CRP via canal interno

### Persona 3: Dra. Ana (Psicóloga CRP responsável técnica)

**Contexto:** Já contratada pela empresa em regime de consultoria. Não opera o sistema dia-a-dia; é acionada quando RH/Sara precisa de leitura técnica ou quando candidato pede revisão LGPD Art. 20.

**Necessidades:**
- Acesso a dados psicométricos completos (raw_responses, T-scores, percentis, normas usadas)
- Capacidade de revisar tom dos templates da devolutiva e propor ajustes
- Auditoria das devolutivas geradas (alguma alucinação? algum candidato impactado?)
- Documentação clara de que sua responsabilidade técnica está documentada no sistema

**Casos de uso:**
- UC-07: Recebe pedido de revisão LGPD Art. 20 (via Sara) → abre painel CRP `/rh/candidato/:id/bigfive/tecnico` → vê tudo (raw_responses, T-scores, normas, prompt usado, output IA, template oficial) → emite parecer
- UC-08: Revisa trimestralmente uma amostra aleatória de devolutivas → valida tom + ajusta templates se necessário
- UC-09: Acompanha métricas operacionais (completion rate, tempo médio) e psicométricas (α de Cronbach quando V2 entregar) → recomenda pivot pra Plan B (BFI-2) se necessário

---

## 5. Requisitos Funcionais

### 5.1 Aplicação do questionário (UX candidato)

| ID | Requisito | Critério de Aceite | Prioridade |
|----|-----------|-------------------|------------|
| RFB-01 | Tela `/candidato/avaliacao/[id]/bigfive/inicio` apresenta disclaimer curado: 4 bullets + checkbox aceite + link "Saiba mais" pra modal LGPD/CFP | Candidato não consegue clicar "Começar" sem marcar checkbox | Must |
| RFB-02 | Tela `/candidato/avaliacao/[id]/bigfive/item/[N]` mostra 1 item de cada vez (N=1..120), Likert 1-5 PT-BR, com botões "Voltar" (habilitado nos últimos 5 itens da sessão atual) e "Próximo" | Click em "Próximo" salva resposta + avança N+1; "Voltar" decrementa N | Must |
| RFB-03 | Cada resposta dispara autosave em `bigfive_respostas_em_progresso` (UPSERT por candidatura_id) | Latência ≤ 200ms; sem bloqueio de UI | Must |
| RFB-04 | Sessão fechada (browser close, refresh) preserva progresso; ao retornar, retoma da última resposta gravada | Cobre tab close + refresh + login expirado + crash de browser | Must |
| RFB-05 | Progress bar visível mostra "Item N de 120" + barra visual proporcional | Atualiza a cada navegação | Must |
| RFB-06 | Após item 120 respondido, tela `/candidato/avaliacao/[id]/bigfive/concluir` mostra resumo + botão "Concluir e ver devolutiva" | Click dispara POST `submit-bigfive-final` síncrono | Must |
| RFB-07 | Durante geração da devolutiva (3-5s), spinner com mensagem "Gerando sua devolutiva personalizada... Isso leva alguns segundos." | Não permite back nem refresh durante spinner | Must |

### 5.2 Submit e scoring

| ID | Requisito | Critério de Aceite | Prioridade |
|----|-----------|-------------------|------------|
| RFB-08 | Endpoint `submit-bigfive-final` (Edge Function Deno) recebe `{candidatura_id, raw_responses: {item_id: 1..5}[120]}` | Valida payload via Zod schema (shape + range); retorna 400 com detalhe se inválido | Must |
| RFB-09 | Server-side re-scoring (anti-tampering): EF roda TS port inline e calcula T-scores + percentis a partir de raw_responses, ignorando qualquer score que tenha vindo do client | Cross-check em CI: fixture com 10 perfis sintéticos retorna mesmos valores que `five-factor-e` Python (Δ ≤ 0.01) | Must |
| RFB-10 | EF grava 1 row em `scores_candidato` com `tipo='big_five'`, `metadata jsonb` populado (ver §7.1) | Trigger DB ON INSERT scores_candidato é só pra audit (não dispara devolutiva — devolutiva é chamada inline pela EF) | Must |
| RFB-11 | EF chama `gerar-devolutiva-bigfive` síncrona; aguarda response (3-5s); retorna devolutiva pronta no response da `submit-bigfive-final` | Timeout 10s; se exceder, retorna erro "Devolutiva sendo gerada — você receberá por email em ~5min" + dispara n8n flow | Must |
| RFB-12 | EF dispara n8n flow `bigfive-email-devolutiva` com `{candidatura_id, devolutiva_id}` em ~1min após gravação | n8n monta email com link permanente e dispara | Must |

### 5.3 Geração da devolutiva (Edge Function `gerar-devolutiva-bigfive`)

| ID | Requisito | Critério de Aceite | Prioridade |
|----|-----------|-------------------|------------|
| RFB-13 | Carrega `docs/conhecimento/big-five/templates-devolutiva.md` em cold start (RAG filesystem padrão Master §8.8); cacheia em memória | Latência ≤ 50ms para load no cold start | Must |
| RFB-14 | Para cada uma das 5 dimensões: identifica banda (≤15/16-35/36-64/65-84/≥85) baseada no percentil; carrega template do nível correto; constrói prompt com `{nome, cargo, percentil_exato, banda, template_oficial}` | Template oficial NÃO é alterado; IA recebe instrução "personalize sem inventar conteúdo, apenas reformule pra incluir nome/cargo/percentil exato" | Must |
| RFB-15 | Chama Claude Sonnet (modelo padrão Master) com tool use forçado (Anthropic structured output); valida output via Zod schema | Schema: `{cabecalho: {nome, dashboard: [{dim, percentil, banda}]×5}, paginas: [{dim, banda, percentil, texto_interpretativo, palavras}]×5, disclaimer_emocional, disclaimer_lgpd_crp}` | Must |
| RFB-16 | Validação de qualidade: cada `texto_interpretativo` tem 100-250 palavras (target 150-200); se fora, retry 1× com instrução "ajuste pra X palavras" | Se 2º try falhar, usa template puro sem personalização (graceful degradation) | Must |
| RFB-17 | Persiste em `devolutivas_candidato.conteudo_jsonb` o output validado + audit fields: `template_version, prompt_version, model_version, raw_response_anthropic, final_text_palavras_count` | Toda chamada Anthropic é logada com input_hash + tokens_input + tokens_output (Master RNF-09) | Must |
| RFB-18 | Disclaimer LGPD/CFP no rodapé: "Self-assessment de estilo de trabalho. Não é teste psicológico. Gerenciado pelo psicólogo responsável técnico Dra. [Nome], CRP-XX/XXXXX. Você pode solicitar revisão a qualquer momento via [link Art. 20]." | Nome do CRP responsável vem de config (ENV var ou tabela `config_sistema`); nunca hard-coded | Must |
| RFB-19 | Disclaimer emocional no cabeçalho da devolutiva: "Este questionário reflete como você se descreveu hoje. Se você estava cansado, com fome, ou passando por momento difícil, os resultados podem refletir esse estado momentâneo." | Texto fixo em template `cabecalho` do `templates-devolutiva.md` | Must |

### 5.4 Layout e entrega da devolutiva

| ID | Requisito | Critério de Aceite | Prioridade |
|----|-----------|-------------------|------------|
| RFB-20 | Tela `/candidato/avaliacao/[id]/bigfive/devolutiva` renderiza devolutiva em 5 páginas (1 por dimensão) + cabeçalho geral (dashboard 5 percentis + bandas + disclaimer emocional) | Navegação tab/swipe (mobile) ou tab horizontal (desktop) | Must |
| RFB-21 | Dashboard mostra 5 percentis em formato visual: nome da dim + percentil cru numérico + banda qualitativa + barra visual proporcional | Espelha página 1 do report BFAS understandmyself | Must |
| RFB-22 | Cada página de dimensão mostra: título "{Dim}: {Banda}" + percentil cru + analogia "Em um grupo de 100 pessoas, você seria mais [dim] que X e menos que Y" + texto interpretativo | Layout responsivo; min font 16px mobile; cores Beauty Smile (não rosa-doce; tons neutros profissionais) | Must |
| RFB-23 | Email de devolutiva (disparado por n8n) contém: assunto "Sua devolutiva do questionário Beauty Smile está pronta" + corpo curto + link permanente pra `/candidato/avaliacao/[id]/bigfive/devolutiva` (tokenizado) | Token tem TTL de 12 meses (alinhado com retenção LGPD); após expira, candidato recebe 404 amigável + opção "solicitar nova cópia" | Must |
| RFB-24 | Devolutiva é gerada UMA VEZ; tentativas posteriores de re-gerar retornam mesma devolutiva persistida (idempotência) | Endpoint `re-gerar-devolutiva-bigfive` (admin only) força nova geração com nova `prompt_version` (audit ambas) | Should |

### 5.5 Painel RH e CRP

| ID | Requisito | Critério de Aceite | Prioridade |
|----|-----------|-------------------|------------|
| RFB-25 | Tela `/rh/candidato/:id/bigfive` (RH role) mostra: dashboard de 5 percentis + bandas + texto-resumo de 100 palavras curado (resumo das 5 dim) + botão "Ver devolutiva completa do candidato" | Texto-resumo é gerado pela mesma EF mas com prompt-resumo separado (para versão executiva) | Must |
| RFB-26 | Tela `/rh/candidato/:id/bigfive/tecnico` (CRP role apenas — checa role no JWT) mostra dados psicométricos completos: raw_responses (120 itens com texto + resposta), T-scores por dim e por faceta (30), percentis com normas usadas, prompt enviado pra IA, output IA bruto | Acesso 100% logado em `audit_log` (quem acessou, quando, qual candidato) | Must |
| RFB-27 | Painel RH NÃO mostra T-score técnico (só percentil arredondado); painel CRP mostra ambos | RLS policy filtra colunas conforme role | Must |
| RFB-28 | Sistema NUNCA permite uso de Big Five como motivo único de rejeição: validação na EF `consolidar-decisao-final` (Master RF-29): se motivo cita Big Five sem outras evidências, exige confirmação extra com justificativa expandida do CRP | SQL query mensal (Master MG-02) audita 0 violações | Must |

### 5.6 LGPD Art. 20 e operações

| ID | Requisito | Critério de Aceite | Prioridade |
|----|-----------|-------------------|------------|
| RFB-29 | Endpoint genérico do Master `lgpd-explicacao-candidato?include_bigfive=true` retorna response enriquecida com: devolutiva completa + raw_responses + scores + normas usadas + nome do CRP responsável + data de geração + botão "solicitar revisão humana" | Reusa Edge Function existente do Master (RF-32); só adiciona bloco condicional de Big Five | Must |
| RFB-30 | Solicitação de revisão humana cria ticket interno (tabela `revisoes_lgpd`) + notifica CRP responsável via email | CRP tem 15 dias úteis pra emitir parecer (Master RNF-07c) | Must |
| RFB-31 | Cron mensal `bigfive-anonimizacao-ttl` (n8n) identifica candidaturas com `decisao_final.em < now() - interval '12 months'` e anonimiza: remove `bigfive_respostas_em_progresso` (raw_responses) + remove PII de `devolutivas_candidato` (substitui nome → "Candidato anonimizado"); mantém scores agregados pra normas internas BR futuras | Logado em `bias_audit_log` (Master); rollback impossível (LGPD) | Must |
| RFB-32 | Endpoint `/api/candidato/exportar-meus-dados` (Master genérico) inclui Big Five completo (raw + scores + devolutiva) em formato JSON portátil (LGPD direito à portabilidade) | Reusa endpoint genérico Master | Must |

---

## 6. Requisitos Não-Funcionais

### 6.1 RNF mensuráveis V1

| ID | Categoria | Requisito | Métrica | Como Testar |
|----|-----------|-----------|---------|------------|
| RNFB-01 | Performance | Aplicação do questionário roda fluida em mobile baixo-perfil (Android 8+, 3GB RAM) | P95 transição entre items ≤ 300ms; zero janks visíveis | Lighthouse mobile + manual em device de teste |
| RNFB-02 | Performance | Endpoint `submit-bigfive-final` com geração inline de devolutiva | P95 ≤ 5s end-to-end | Logging Vercel + alerta se > 5s |
| RNFB-03 | Performance | Cold start da EF `gerar-devolutiva-bigfive` carrega templates RAG | ≤ 50ms load filesystem | Profile cold start em CI |
| RNFB-04 | Métrica de produto | Completion rate da aplicação | ≥ 75% (mín); ≥ 90% (ideal) | SQL agregado mensal sobre `bigfive_respostas_em_progresso` |
| RNFB-05 | Métrica de produto | Tempo médio de aplicação | 15-25 min | SQL agregado mensal |
| RNFB-06 | Custo | Custo IA médio por devolutiva gerada | ≤ R$ 0,03 | Anthropic billing × devolutivas/mês |
| RNFB-07 | Segurança | Anti-tampering: scores sempre re-calculados server-side a partir de raw_responses | Test E2E que envia scores manipulados → server ignora e usa raw_responses | Playwright E2E |
| RNFB-08 | Segurança | RLS em `bigfive_respostas_em_progresso`, `scores_candidato`, `devolutivas_candidato`: candidato vê só própria; RH vê todas; CRP vê todas + raw_responses | pgTAP suite valida policies; E2E tenta cross-access | pgTAP + Playwright |
| RNFB-09 | Compliance LGPD | TTL de 12 meses + anonimização automática | Cron mensal n8n + log em `bias_audit_log` | UAT trimestral |
| RNFB-10 | Compliance CFP | Disclaimer "self-assessment + responsável técnico CRP nominal" presente em 100% das devolutivas | Grep CI nos templates + E2E valida render | CI custom check |
| RNFB-11 | Compliance | Linguagem "questionário de perfil comportamental" / "self-assessment" — NUNCA "teste de personalidade" / "teste psicológico" | Grep CI em todo source + UI por strings proibidas | CI lint custom (Master RNF-12) |
| RNFB-12 | Auditoria | Toda devolutiva gerada tem audit completo: `template_version, prompt_version, model_version, tokens_input, tokens_output, raw_response_anthropic, final_text_palavras_count` | SQL query retorna 100% dos rows com campos populados | SQL audit |
| RNFB-13 | Idioma | Devolutiva 100% PT-BR neutro corporativo (sem provocações Peterson-style); validado pelo psicólogo CRP responsável antes do go-live | Sample de 25 templates revisados pelo CRP, assinatura formal em doc interno | UAT psicólogo CRP |
| RNFB-14 | Acessibilidade | Devolutiva passa WCAG AA (contraste, navegação por teclado, leitor de tela) | axe-core score ≥ 90 | axe + revisão manual |
| RNFB-15 | Tipos | `database.types.ts` regenerado pós-migration via `npm run db:types` (Master RNF-13) | `tsc --noEmit` passa sempre | Husky pre-commit hook |

### 6.2 RNF aspiracionais V2

(documentados aqui por completude; NÃO entram como gate em V1)

| ID | Categoria | Requisito | Trigger pra reativar |
|----|-----------|-----------|---------------------|
| RNFB-V2-01 | Métrica psicométrica | α de Cronbach por dimensão ≥ 0.70 (≥ 0.80 ideal) | n≥100 candidatos completos |
| RNFB-V2-02 | Métrica psicométrica | α de Cronbach por faceta (30 facetas) ≥ 0.50 | n≥300 candidatos completos |
| RNFB-V2-03 | Métrica de produto | NPS candidato sobre devolutiva ≥ 30 | Survey opcional V2 |
| RNFB-V2-04 | Métrica de produto | Taxa de pedido de revisão LGPD Art. 20 ≤ 5% | Após 6 meses operação |
| RNFB-V2-05 | Validade | Detecção automática de respostas inválidas ≥ 95% precisão (straight-lining + tempo curto + reverse-code consistency) | V2 sprint dedicada |

---

## 7. Considerações Técnicas

### 7.1 Schema (incremento sobre Master §8.2)

#### `bigfive_respostas_em_progresso` (NOVA)

| Campo | Tipo | Constraint | Descrição |
|-------|------|-----------|-----------|
| id | uuid | PK, default gen_random_uuid() | |
| candidatura_id | uuid | FK candidaturas(id), UNIQUE NOT NULL | 1:1 |
| respostas | jsonb | NOT NULL, default '{}' | `{item_id (1-120): score (1-5)}` |
| iniciado_em | timestamptz | NOT NULL, default now() | timestamp da 1ª resposta |
| ultima_atividade_em | timestamptz | NOT NULL, default now() | timestamp da última resposta (touch a cada autosave) |
| completou_em | timestamptz | NULL | timestamp do submit final (NULL enquanto em progresso) |
| user_agent | text | NULL | metadata mobile/desktop |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

**Index:** `idx_bigfive_progresso_candidatura` em `candidatura_id`. **RLS:** candidato lê/escreve só própria; CRP/RH lê todas; ninguém deleta exceto cron de TTL.

#### `scores_candidato.metadata` (refina Master §8.2)

Novo campo `metadata jsonb NOT NULL default '{}'` em `scores_candidato`. Para `tipo='big_five'`, payload:

```json
{
  "instrumento": "ipip_neo_120",
  "versao_item_bank": "v1",
  "lingua": "pt-br",
  "raw_responses": {"1": 4, "2": 3, "...": "...", "120": 5},
  "domain_scores": {
    "O": {"raw": 87, "t_score": 56.3, "percentile": 73, "level": "moderadamente_alto"},
    "C": {"raw": 95, "t_score": 61.2, "percentile": 86, "level": "muito_alto"},
    "E": {"raw": 72, "t_score": 48.1, "percentile": 42, "level": "medio"},
    "A": {"raw": 88, "t_score": 54.7, "percentile": 67, "level": "moderadamente_alto"},
    "N": {"raw": 60, "t_score": 44.5, "percentile": 28, "level": "moderadamente_baixo"}
  },
  "facet_scores": [
    {"facet_id": 1, "name": "Anxiety", "domain": "N", "raw": 12, "t_score": 45.0, "percentile": 31, "level": "moderadamente_baixo"},
    "..."
  ],
  "norm_group_used": "johnson_2014_intl_neutral_age_21_40",
  "completion_time_seconds": 1380,
  "iniciado_em": "2026-04-28T14:30:00Z",
  "completou_em": "2026-04-28T14:53:00Z",
  "flags": []
}
```

**Validação Zod:** schema rígido em `supabase/functions/_shared/schemas/bigfive-scores.ts`. Insert via EF rejeita payload malformado.

**Banda level enum:** `'muito_baixo' | 'moderadamente_baixo' | 'medio' | 'moderadamente_alto' | 'muito_alto'`.

#### `devolutivas_candidato.conteudo_jsonb` (refina Master §8.2)

Para `tipo='bigfive'`, payload:

```json
{
  "candidato_nome": "Maria Silva",
  "vaga_cargo": "Recepcionista",
  "cabecalho": {
    "dashboard": [
      {"dim": "Abertura à Experiência", "percentil": 73, "banda": "moderadamente_alto"},
      {"dim": "Conscienciosidade", "percentil": 86, "banda": "muito_alto"},
      {"dim": "Extroversão", "percentil": 42, "banda": "medio"},
      {"dim": "Amabilidade", "percentil": 67, "banda": "moderadamente_alto"},
      {"dim": "Sensibilidade Emocional", "percentil": 28, "banda": "moderadamente_baixo"}
    ],
    "disclaimer_emocional": "Este questionário reflete como você se descreveu hoje. Se você estava cansado, com fome, ou passando por momento difícil, os resultados podem refletir esse estado momentâneo."
  },
  "paginas": [
    {
      "dim": "Conscienciosidade",
      "banda": "muito_alto",
      "percentil": 86,
      "analogia": "Em um grupo de 100 pessoas, você seria mais conscienciosa que 85 e menos que 14.",
      "texto_interpretativo": "Pessoas com conscienciosidade muito alta tendem a... [~150-200 palavras personalizadas com nome/cargo/percentil]",
      "palavras_count": 187
    },
    "..."
  ],
  "disclaimer_lgpd_crp": "Self-assessment de estilo de trabalho. Não é teste psicológico. Gerenciado pela Dra. [Nome], CRP-XX/XXXXX. Você pode solicitar revisão a qualquer momento via /candidato/lgpd-revisao."
}
```

**Audit fields adicionais em `devolutivas_candidato`** (refina Master):
- `template_version text NOT NULL` (ex: `'2026-04-28-v1'`)
- `prompt_version text NOT NULL` (ex: `'gerar-devolutiva-bigfive-v1.0'`)
- `model_version text NOT NULL` (ex: `'claude-sonnet-4-6'`)
- `raw_response_anthropic jsonb NULL` (response bruto pra debug)
- `tokens_input int NULL`
- `tokens_output int NULL`

### 7.2 Scoring algorithm (TS port pseudocódigo)

Implementação em `supabase/functions/_shared/bigfive-scorer.ts` (~150 linhas), baseada em [`bigfive-web/lib/scoring.ts`](https://github.com/rubynor/bigfive-web/blob/main/apps/web/lib/scoring.ts):

```typescript
// supabase/functions/_shared/bigfive-scorer.ts

import { REVERSED_ITEMS_120, FACET_TO_DOMAIN, FACET_NAMES } from "./bigfive-constants.ts";
import { JOHNSON_NORMS_2014 } from "./bigfive-norms.ts"; // 8 grupos × 70 valores

export type Domain = "O" | "C" | "E" | "A" | "N";
export type Sex = "M" | "F" | "N";
export type Level = "muito_baixo" | "moderadamente_baixo" | "medio" | "moderadamente_alto" | "muito_alto";

export interface ScoreResult {
  domains: Record<Domain, { raw: number; t_score: number; percentile: number; level: Level }>;
  facets: Array<{ facet_id: number; name: string; domain: Domain; raw: number; t_score: number; percentile: number; level: Level }>;
  norm_group_used: string;
}

const reverse = (s: number): number => 6 - s;
const facetOfItem = (itemId: number): number => ((itemId - 1) % 30) + 1;

const percentileFromT = (t: number): number => {
  // Aproximação cúbica de Johnson 2014
  const pct = 210.335958661391
    - (16.7379362643389 * t)
    + (0.405936512733332 * t * t)
    - (0.00270624341822222 * t * t * t);
  return Math.max(1, Math.min(99, Math.round(pct)));
};

const classify = (percentile: number): Level => {
  if (percentile <= 15) return "muito_baixo";
  if (percentile <= 35) return "moderadamente_baixo";
  if (percentile <= 64) return "medio";
  if (percentile <= 84) return "moderadamente_alto";
  return "muito_alto";
};

const selectNormGroup = (sex: Sex, age: number): string => {
  let ageBand: string;
  if (age < 21) ageBand = "lt21";
  else if (age <= 40) ageBand = "21_40";
  else if (age <= 60) ageBand = "41_60";
  else ageBand = "gt60";
  return `johnson_2014_intl_${sex.toLowerCase()}_${ageBand}`;
};

export function scoreIpipNeo120(
  responses: Record<number, number>,
  sex: Sex = "N",
  age: number = 30
): ScoreResult {
  // 1. Reverse scoring
  const corrected: Record<number, number> = {};
  for (const [itemIdStr, score] of Object.entries(responses)) {
    const itemId = parseInt(itemIdStr);
    corrected[itemId] = REVERSED_ITEMS_120.has(itemId) ? reverse(score) : score;
  }

  // 2. Facet scores (raw, range 4-20)
  const facetRaw: Record<number, number> = {};
  for (let f = 1; f <= 30; f++) facetRaw[f] = 0;
  for (const [itemIdStr, val] of Object.entries(corrected)) {
    const itemId = parseInt(itemIdStr);
    facetRaw[facetOfItem(itemId)] += val;
  }

  // 3. Domain scores (raw, range 24-120)
  const domainRaw: Record<Domain, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  for (let f = 1; f <= 30; f++) {
    domainRaw[FACET_TO_DOMAIN[f]] += facetRaw[f];
  }

  // 4. T-score, percentil, classificação
  const normGroupKey = selectNormGroup(sex, age);
  const norm = JOHNSON_NORMS_2014[normGroupKey];

  const domains = {} as ScoreResult["domains"];
  for (const d of ["O", "C", "E", "A", "N"] as Domain[]) {
    const t = 50 + 10 * (domainRaw[d] - norm.domain[d].mean) / norm.domain[d].sd;
    const pct = percentileFromT(t);
    domains[d] = {
      raw: domainRaw[d],
      t_score: Math.round(t * 100) / 100,
      percentile: pct,
      level: classify(pct),
    };
  }

  const facets: ScoreResult["facets"] = [];
  for (let f = 1; f <= 30; f++) {
    const t = 50 + 10 * (facetRaw[f] - norm.facet[f].mean) / norm.facet[f].sd;
    const pct = percentileFromT(t);
    facets.push({
      facet_id: f,
      name: FACET_NAMES[f],
      domain: FACET_TO_DOMAIN[f],
      raw: facetRaw[f],
      t_score: Math.round(t * 100) / 100,
      percentile: pct,
      level: classify(pct),
    });
  }

  return { domains, facets, norm_group_used: normGroupKey };
}
```

**Cross-check em CI** (`tests/bigfive-scorer-cross-check.test.ts`):

```typescript
// Fixture com 10 perfis sintéticos
import fixtures from "./fixtures/bigfive-10-profiles.json";
import expectedScores from "./fixtures/bigfive-10-profiles-five-factor-e.json"; // gerado uma vez por Python script

for (const [profileId, profile] of Object.entries(fixtures)) {
  test(`Profile ${profileId} matches five-factor-e Python`, () => {
    const result = scoreIpipNeo120(profile.responses, profile.sex, profile.age);
    const expected = expectedScores[profileId];
    for (const d of ["O", "C", "E", "A", "N"]) {
      expect(Math.abs(result.domains[d].t_score - expected.domains[d].t_score)).toBeLessThan(0.01);
      expect(result.domains[d].percentile).toBe(expected.domains[d].percentile);
    }
  });
}
```

Script Python pra gerar `bigfive-10-profiles-five-factor-e.json` (rodado uma vez, commitado): `scripts/generate-bigfive-fixtures.py`.

### 7.3 Edge Functions

#### `submit-bigfive-final` (NOVA)

| Campo | Valor |
|-------|-------|
| Trigger | HTTP POST do client candidato |
| Input | `{candidatura_id: uuid, raw_responses: {[item_id: string]: 1-5}}` (Zod) |
| Output | `{devolutiva: ConteudoDevolutiva, score_id: uuid, devolutiva_id: uuid}` |
| Modelo IA | N/A (chama EF `gerar-devolutiva-bigfive` internamente) |
| Estimativa custo | R$ 0 (sem IA própria) — custo total = custo de `gerar-devolutiva-bigfive` |
| Latência alvo | P95 ≤ 5s |

Pseudocódigo:

```typescript
// supabase/functions/submit-bigfive-final/index.ts
import { scoreIpipNeo120 } from "../_shared/bigfive-scorer.ts";
import { generateDevolutivaBigfive } from "../gerar-devolutiva-bigfive/handler.ts";

export default async (req: Request) => {
  const body = SubmitBigfiveSchema.parse(await req.json());

  // Anti-tampering: re-score server-side
  const candidato = await db.from("candidatos").select("sex, age").eq("id", body.candidatura_id).single();
  const scores = scoreIpipNeo120(body.raw_responses, candidato.sex, candidato.age);

  // Persist scores
  const { data: scoreRow } = await db.from("scores_candidato").insert({
    candidatura_id: body.candidatura_id,
    tipo: "big_five",
    score_geral: scores.domains.C.percentile, // sentinela genérica
    metadata: {
      instrumento: "ipip_neo_120",
      versao_item_bank: "v1",
      lingua: "pt-br",
      raw_responses: body.raw_responses,
      domain_scores: scores.domains,
      facet_scores: scores.facets,
      norm_group_used: scores.norm_group_used,
      completion_time_seconds: await getCompletionTime(body.candidatura_id),
      iniciado_em: await getIniciadoEm(body.candidatura_id),
      completou_em: new Date().toISOString(),
      flags: [],
    },
  }).select().single();

  // Mark progress as complete
  await db.from("bigfive_respostas_em_progresso").update({
    completou_em: new Date().toISOString(),
  }).eq("candidatura_id", body.candidatura_id);

  // Generate devolutiva inline (síncrona)
  const devolutiva = await generateDevolutivaBigfive({ score_id: scoreRow.id });

  // Fire-and-forget: trigger n8n email flow
  await fetch(N8N_WEBHOOK_BIGFIVE_EMAIL, {
    method: "POST",
    body: JSON.stringify({ candidatura_id: body.candidatura_id, devolutiva_id: devolutiva.id }),
  });

  return Response.json({ devolutiva: devolutiva.conteudo_jsonb, score_id: scoreRow.id, devolutiva_id: devolutiva.id });
};
```

#### `gerar-devolutiva-bigfive` (REFINADA — já existia no Master)

| Campo | Valor |
|-------|-------|
| Trigger | Chamada interna por `submit-bigfive-final` (HTTP POST) |
| Input | `{score_id: uuid}` |
| Output | `{id: uuid, conteudo_jsonb: ConteudoDevolutiva, audit_fields}` |
| Modelo IA | claude-sonnet-4-6 + RAG `docs/conhecimento/big-five/templates-devolutiva.md` |
| Custo | ~R$ 0,02-0,03 (input ~3000 tokens template + RAG; output ~1500-2000 tokens) |
| Latência alvo | P95 ≤ 4s |

Pseudocódigo simplificado:

```typescript
import { Anthropic } from "npm:@anthropic-ai/sdk";
import { DevolutivaSchema } from "../_shared/schemas/devolutiva-bigfive.ts";

const TEMPLATES = await loadTemplatesDevolutiva(); // cold start cache

export async function generateDevolutivaBigfive({ score_id }) {
  const score = await db.from("scores_candidato").select("*, candidaturas(*, candidatos(*), vagas(*))").eq("id", score_id).single();

  const candidatoNome = score.candidaturas.candidatos.nome.split(" ")[0];
  const cargoVaga = score.candidaturas.vagas.cargo;
  const domains = score.metadata.domain_scores;

  const dimNomes = {
    O: "Abertura à Experiência",
    C: "Conscienciosidade",
    E: "Extroversão",
    A: "Amabilidade",
    N: "Sensibilidade Emocional", // NÃO "Neuroticismo"
  };

  // Build prompt with templates oficiais
  const paginas = await Promise.all((["O", "C", "E", "A", "N"] as const).map(async (d) => {
    const template = TEMPLATES.dimensoes[d][domains[d].level]; // template oficial pro nível exato
    const prompt = buildPersonalizationPrompt({
      template,
      candidatoNome,
      cargoVaga,
      percentil: domains[d].percentile,
      banda: domains[d].level,
      dimNome: dimNomes[d],
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      tools: [{ name: "emit_pagina", input_schema: PaginaSchema }],
      tool_choice: { type: "tool", name: "emit_pagina" },
      messages: [{ role: "user", content: prompt }],
    });

    const pagina = response.content[0].input;
    if (pagina.palavras_count < 100 || pagina.palavras_count > 250) {
      // retry once with adjustment instruction
    }
    return pagina;
  }));

  const devolutiva = {
    candidato_nome: score.candidaturas.candidatos.nome,
    vaga_cargo: cargoVaga,
    cabecalho: {
      dashboard: (["O", "C", "E", "A", "N"] as const).map((d) => ({
        dim: dimNomes[d],
        percentil: domains[d].percentile,
        banda: domains[d].level,
      })),
      disclaimer_emocional: TEMPLATES.disclaimer_emocional,
    },
    paginas,
    disclaimer_lgpd_crp: TEMPLATES.disclaimer_lgpd_crp.replace("[Nome]", CRP_RESPONSAVEL_NOME).replace("CRP-XX/XXXXX", CRP_RESPONSAVEL_REGISTRO),
  };

  // Persist with audit
  return await db.from("devolutivas_candidato").insert({
    candidatura_id: score.candidatura_id,
    tipo: "bigfive",
    conteudo_jsonb: devolutiva,
    template_version: TEMPLATES.version,
    prompt_version: "gerar-devolutiva-bigfive-v1.0",
    model_version: "claude-sonnet-4-6",
    custo_tokens_input: totalTokensIn,
    custo_tokens_output: totalTokensOut,
  }).select().single();
}
```

### 7.4 RAG architecture (templates + Word docs + report BFAS)

Padrão Master §8.8 (filesystem RAG, load on cold start). Para Big Five especificamente:

```
docs/conhecimento/big-five/
├── templates-devolutiva.md          ← 25 templates oficiais (5 dim × 5 níveis) + cabeçalho + disclaimers
├── PESQUISA-big-five-ipip-neo-120-ptbr.md
├── Abertura_Experiencia_Big5.docx   ← interpretação extensa (curso Peterson PT-BR)
├── Amabilidade_Big5.docx
├── Conscienciosidade_Big5.docx
├── Extroversao_Big5.docx
├── Neuroticismo_Big5.docx
├── report big five.pdf              ← modelo de qualidade BFAS (referência visual + tom)
├── Big Five.md                      ← perguntas BFAS originais (referência de formato)
└── fontes/
    ├── ipip-neo-120-questions-pt-br.json   ← item bank carregado em runtime
    ├── ipip-neo-120-questions-en.json
    ├── Andrade-2008-IGFP-5-tese-UnB.pdf
    ├── Pires-2023-BFI-2-validacao-PT-BR.pdf
    └── ...
```

EF `gerar-devolutiva-bigfive` carrega:
1. `templates-devolutiva.md` (sempre, cold start cache)
2. Word doc da dimensão sendo gerada (ex: gerou texto da Conscienciosidade → carrega `Conscienciosidade_Big5.docx` como context adicional pra IA enriquecer template)
3. NÃO carrega `report big five.pdf` em runtime (é referência humana, não IA-consumível direto — extrato manual já está nos templates)

EF `submit-bigfive-final` carrega:
1. `fontes/ipip-neo-120-questions-pt-br.json` (item bank pra validar item_id range 1-120)
2. Constants pré-computadas em TS (`REVERSED_ITEMS_120`, `FACET_TO_DOMAIN`, `FACET_NAMES`, `JOHNSON_NORMS_2014`)

### 7.5 LGPD ops

#### TTL + anonimização (cron mensal n8n)

Workflow `bigfive-anonimizacao-ttl`:
- Trigger: cron 1× ao mês, dia 1, 03:00 BRT
- Query: `SELECT c.id FROM candidaturas c JOIN decisao_final df ON df.candidatura_id = c.id WHERE df.em < now() - interval '12 months' AND NOT EXISTS (SELECT 1 FROM bigfive_anonimizacao_log WHERE candidatura_id = c.id)`
- Para cada candidatura:
  - DELETE FROM `bigfive_respostas_em_progresso WHERE candidatura_id = X` (raw_responses são deletadas)
  - UPDATE `scores_candidato SET metadata = metadata - 'raw_responses' WHERE candidatura_id = X AND tipo = 'big_five'` (raw deletado, scores agregados ficam pra normas internas BR futuras)
  - UPDATE `devolutivas_candidato SET conteudo_jsonb = jsonb_set(conteudo_jsonb, '{candidato_nome}', '"Candidato anonimizado"') WHERE candidatura_id = X AND tipo = 'bigfive'`
  - INSERT INTO `bigfive_anonimizacao_log (candidatura_id, anonimizado_em)` VALUES (...)
  - INSERT INTO `bias_audit_log (...)` (audit trail Master)
- Email de relatório pra DPO: "X candidaturas anonimizadas neste mês"

#### Endpoint LGPD Art. 20 (reusa Master)

`lgpd-explicacao-candidato?include_bigfive=true`:
- Reusa Edge Function existente do Master (RF-32)
- Bloco condicional adiciona ao response:
  ```json
  {
    "bigfive": {
      "devolutiva_completa": {...},
      "raw_responses": {...},
      "scores": {...},
      "norm_group_used": "...",
      "responsavel_tecnico": {"nome": "Dra. ...", "registro_crp": "CRP-XX/XXXXX"},
      "data_geracao": "2026-04-28T14:55:00Z",
      "opcao_revisao_humana": {
        "endpoint": "/api/candidato/solicitar-revisao-lgpd",
        "prazo_resposta": "15 dias úteis"
      }
    }
  }
  ```

### 7.6 Plan B specs (BFI-2 pivot)

Trigger híbrido: métricas alertam (completion <70% após n≥50 OR α de Cronbach <0.65 após n≥100), CRP decide pivotar.

Migração estimada em **1-2 dias eng effort**:

1. **Item bank:** baixar [BFI-2 PT-BR de Pires 2023 (OSF)](https://osf.io/4a8cf/) → converter pra `docs/conhecimento/big-five/fontes/bfi-2-questions-pt-br.json` (60 itens)
2. **Scoring:** ajustar `bigfive-scorer.ts`:
   - `REVERSED_ITEMS_60` em vez de `REVERSED_ITEMS_120`
   - 15 facetas em vez de 30 (3 por domínio em vez de 6)
   - Normas Pires 2023 em vez de Johnson 2014 (compilar de paper)
3. **Schema:** zero mudanças (`metadata.instrumento` flag muda de `'ipip_neo_120'` pra `'bfi_2'`)
4. **UI candidato:** carrega item bank conforme config `metadata.instrumento`; UI é agnóstica (60 ou 120 items, mesmo loop)
5. **Templates de devolutiva:** ZERO MUDANÇA (templates são por dimensão OCEAN, não por instrumento)
6. **Disclaimer:** ajusta menção do instrumento ("BFI-2" em vez de "IPIP-NEO-120")
7. **Migração de candidatos antigos:** scores existentes ficam com `metadata.instrumento='ipip_neo_120'`; novos vão com `'bfi_2'`. Nenhuma re-aplicação retroativa.
8. **Email pra licença comercial:** Christopher Soto (Colby) + Oliver John (Berkeley) — formalizar permissão antes do go-live com BFI-2.

---

## 8. Riscos & Mitigações

| # | Risco | Prob. | Impacto | Mitigação | Owner |
|---|-------|-------|---------|-----------|-------|
| 1 | **Risco psicométrico**: tradução IPIP-NEO-120 PT-BR não-validada → α de Cronbach baixo em alguma dimensão | Média | Alto (devolutiva sem validade científica) | (a) Cross-check em CI com `five-factor-e` Python; (b) painel interno do CRP responsável valida tom dos templates antes do go-live; (c) métrica α monitorada após n≥100 → trigger Plan B se < 0.65; (d) disclaimer transparente "instrumento em validação" no rodapé | CRP responsável |
| 2 | **CFP enforcement**: denúncia de uso indevido de "teste psicológico" → encaminhamento à Polícia Federal | Baixa | Crítico (legal + reputacional) | (a) Posicionamento "self-assessment" + linguagem RNF-12; (b) psicólogo CRP responsável técnico assina cada devolutiva; (c) documentação interna (memo técnico-jurídico) cadastrada antes do go-live; (d) score Big Five NUNCA é motivo único de rejeição (RNFB-28 + audit MG-02) | Jurídico + CRP |
| 3 | **Hallucination IA na devolutiva**: Claude inventa conteúdo fora dos templates oficiais → afirmação errada sobre candidato | Média | Alto (LGPD + reputacional) | (a) Templates oficiais como source of truth + prompt instrução explícita "não invente conteúdo"; (b) validação Zod schema rígida; (c) word count check com retry; (d) graceful degradation pra template puro se IA falhar 2× | Eng + CRP (revisão amostral trimestral) |
| 4 | **Tampering client-side**: candidato manipula scores via DevTools antes do submit | Baixa | Médio (validade comprometida em 1 candidato) | Server-side re-scoring (RNFB-07) — scores recalculados a partir de raw_responses, qualquer manipulação client-side é ignorada | Eng |
| 5 | **Completion rate baixo (<75%)**: candidatos abandonam no item 60-80 | Média | Médio (perda de dado + sinaliza UX ruim) | (a) Autosave + resume on refresh; (b) progress bar visível; (c) tempo médio anunciado no disclaimer; (d) monitoramento RNFB-04 + alerta se < 75% após 50 candidatos | RH + Eng |
| 6 | **Custo IA explode**: muitos candidatos ou retries → ultrapassa R$ 0,03/devolutiva | Baixa | Médio (constraint Master) | (a) Anthropic prompt caching (vaga + template); (b) max_tokens output capped em 2500; (c) max 1 retry por dimensão; (d) graceful degradation pra template puro se custo passar threshold | Eng |
| 7 | **Norma internacional inadequada pra BR**: percentil 67 baseado em norma EUA não reflete percentil BR real | Alta | Baixo-Médio (devolutiva tecnicamente correta mas culturalmente off) | (a) Disclaimer "comparado com amostra normativa internacional"; (b) plano de normas internas BR após n≥300 (V2); (c) painel CRP avalia desvios sistemáticos | CRP |

### 8.1 Pre-mortem (worst case scenarios)

- **Pesadelo 1:** primeira semana, 30 candidatos completam, completion rate é 40%, candidatos reclamam "muito longo" no canal de feedback. → **Resposta:** evaluar imediatamente shift pra BFI-2 (60 itens, 12-15 min) via Plan B.
- **Pesadelo 2:** candidato rejeitado entra com ação trabalhista citando "filtragem por personalidade" → **Resposta:** auditoria SQL prova score Big Five não foi motivo único (MG-02); CRP responsável fornece parecer técnico; documentação interna serve como defesa.
- **Pesadelo 3:** Claude alucina e gera devolutiva falando que candidato tem "tendência a transtorno de ansiedade" (saúde mental — proibido) → **Resposta:** schema Zod valida texto contra blacklist de termos clínicos antes de persistir; retry forçado; se falhar, template puro.

---

## 9. Posicionamento Legal CFP/SATEPSI

(Resolve Q5 do §10 do Master)

### 9.1 Estratégia adotada (Cenário B/C híbrido da Pesquisa #2 §8)

- **Instrumento:** IPIP-NEO-120 PT-BR (Cenário C — autonomia de licença, item bank pronto)
- **Posicionamento UI:** "Self-assessment de estilo de trabalho" / "Questionário de perfil comportamental" — NUNCA "teste psicológico" / "teste de personalidade"
- **Responsável técnico:** psicólogo CRP ativo já contratado pela empresa (regime de consultoria mensal). Nome + registro CRP aparecem em TODA devolutiva (RFB-18) e em TODA explicação LGPD Art. 20 (RFB-29)
- **Score não-eliminatório:** documentado em código (RFB-28) + auditoria SQL mensal (MG-02)
- **Resultado entregue ao candidato como relatório próprio** + opção de compartilhar com a clínica (já implícito — devolutiva é do candidato; gestor vê resumo executivo)
- **Memorando técnico-jurídico** redigido antes do go-live, arquivado em `docs/lgpd/memo-bigfive-cfp-2026.md` (a criar pelo jurídico interno + CRP responsável)
- **Bias audit operacional:** mensal, regra 4/5 EEOC, rodando em `bias_audit_log` (Master RNF-07b)

### 9.2 Riscos legais residuais e mitigação

- **Risco contravenção penal Art. 47 Lei 3.688/1941** (exercício ilegal função privativa): mitigado por responsável técnico CRP ativo
- **Risco Lei 9.029/1995** (discriminação trabalhista): mitigado por score não-eliminatório + bias audit + decisão sempre humana
- **Risco LGPD Art. 20** (revisão de decisão automatizada): mitigado por endpoint de explicação + opção de revisão humana com prazo de 15 dias úteis (RNFB-09)

### 9.3 Documentos legais a produzir antes do go-live

- [ ] Memo técnico-jurídico CFP (`docs/lgpd/memo-bigfive-cfp-2026.md`) — Jurídico + CRP
- [ ] Termo de consentimento específico LGPD (texto a aprovar pelo Jurídico)
- [ ] Política de retenção (12 meses + anonimização) documentada em `docs/lgpd/politica-retencao-bigfive.md`
- [ ] Contrato com psicólogo CRP responsável (regime consultoria) — RH
- [ ] Treinamento Sara (RH) sobre interpretação Big Five contextual + quando acionar CRP

---

## 10. Questões em Aberto

| # | Questão | Responsável | Prazo | Status |
|---|---------|-------------|-------|--------|
| Q1 | Nome + registro CRP do psicólogo responsável técnico (pra hardcode no `disclaimer_lgpd_crp` template) | RH | Pré Phase 2 do M2 | Aberta — Fernando confirma que psicólogo está contratado, falta formalizar nome no PRD |
| Q2 | Memorando técnico-jurídico CFP precisa de revisão por advogado externo? | Jurídico | Pré go-live | Aberta |
| Q3 | Cor + identidade visual da devolutiva (Beauty Smile usa rosa/coral; Big Five é tema sério — talvez tons neutros profissionais sejam melhor) | Design | Pré Phase 2 | Aberta |
| Q4 | Candidato pode pedir devolutiva impressa em PDF? (V2 lista PDF como aspiracional) | Produto | V2 | Diferida |
| Q5 | Treinamento Sara sobre interpretação Big Five — quem ministra? CRP responsável? | RH | Pré rollout Phase 5 do M2 | Aberta |
| Q6 | Bias audit mensal: quem é o auditor designado? (Master Q7 do §10) | RH/Jurídico | Pré M2 | Herdada do Master |
| Q7 | Email de devolutiva: assinatura no rodapé com nome do CRP responsável OU "Equipe Beauty Smile"? | Marketing + CRP | Pré Phase 2 | Aberta |
| Q8 | Sex/age do candidato pra select_norm_group: vem da inscrição (Etapa 1) ou perguntar separadamente? Master RNF-07 proíbe campos de sexo/idade na inscrição (LGPD-clean) | Eng + RH | Pré Phase 2 | Aberta — provável solução: pergunta opcional pré-Big Five com explicação ("usado pra calibrar comparação com norma; pode pular = norma neutra usada") |

---

## 11. Histórico de Mudanças

| Versão | Data | Autor | Mudança |
|--------|------|-------|---------|
| 1.0 | 2026-04-28 | Fernando + Claude | Versão inicial. Substitui PRD legado `docs/prds/bigfive-prd.md`. Resolve placeholders v0.2 do Master (RF-15, RF-19a, RF-19b, EF `gerar-devolutiva-bigfive`, schema `devolutivas_candidato`). Decisões-chave: IPIP-NEO-120 + devolutiva D-lite (5 dim + percentil cru + 5 bandas + texto rico ~150-200 palavras) + scoring TS port inline + híbrido templates+IA + nomenclatura "Sensibilidade Emocional" + 5 páginas layout + TTL 12 meses + Plan B BFI-2 pivot trigger híbrido. Decisão lockada original "SEM percentil cru pro candidato" foi conscientemente revogada em favor do alinhamento com referencial BFAS report do Fernando. |
