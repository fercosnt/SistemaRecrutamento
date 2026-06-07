# PRD-MASTER M2 — Funil RH + Avaliação por IA (Sistema de Recrutamento Beauty Smile)

| Campo | Valor |
|-------|-------|
| Autor | Fernando Costa Neto |
| Data | 2026-04-26 |
| Status | **v1.1** — 5/5 mini-PRDs consolidados (v1.0) + **Etapa 1 reespecificada** a partir do funil legado de 2 portões (`perguntas-vagas.md`): bloco de qualificação por cargo (RF-01a), knockouts padrão (presencial + harmonização), data de nascimento visível, perguntas soft saneadas. **Pronto para `/gsd-complete-milestone` (M1) → `/gsd-new-milestone` (M2) → `/gsd-discuss-phase`** |
| Nível | Comprehensive |
| Stakeholders | Beauty Smile (rede de clínicas odontológicas), equipe RH, gestores de clínica, candidatos |
| Versão | 1.1 |
| Última revisão | 2026-06-06 |
| Documento mestre relacionado | `docs/prds/PRD-MASTER-sistema-recrutamento.md` (v1.2) |
| Milestone GSD | M2 — Funil RH (próximo após M1 — MVP Candidato) |
| Branch base prevista | A definir após `/gsd-complete-milestone` (M1) |

---

## 0. Sumário Executivo

Este PRD especifica o **lado RH** do Sistema de Recrutamento Beauty Smile, sucedendo o MVP Candidato (M1, Phases 1-5) que entregou cadastro, login, listagem de vagas, candidatura e perfil candidato. O M2 entrega o **funil de contratação completo** com 6 etapas, integração de IA em 7 pontos críticos, scorecards estruturados via BARS, comparativo entre candidatos sob demanda, e arquitetura LGPD-compliant com auditoria mensal de bias.

**Mudanças de design vs PRD-Master v1.2:**
- Pipeline reorganizado de 8 etapas (com `testes_async` paralelo) para **6 etapas (Modelo B)** com Work Sample/SJT como núcleo eliminatório
- Big Five degradado de eliminatório para **contextual** (validade preditiva modesta confirmada por pesquisa)
- DISC retirado do default, vira **opt-in para vagas de liderança**
- Cognitivo: **prova de raciocínio lógico (itens CC0) substitui ICAR60 e Raven** (ambos descartados — ver §15 e `PRD-cognitivo-raciocinio.md`), aplicada **online com proctoring leve** como contextual
- **Cultura como dimensão** dentro de redação avaliada por IA, não etapa separada
- Adição de **camada de IA** em 7 pontos do funil com prompts versionados, output estruturado e auditoria
- Constraint do PRD-Master atualizado: **n8n permitido para automações periféricas** (notificações, lembretes), vetado em decisões avaliativas

**Upstream consumido (v0.2):**
- `docs/prds/PRD-MASTER-sistema-recrutamento.md` v1.2 (PRD-Master do sistema)
- `docs/conhecimento/` — knowledge base RAG operacional (ver §8.8):
  - `big-five/` — PESQUISA #2 + item bank IPIP-NEO-120 PT-BR JSON + 6 PDFs acadêmicos + 5 Word docs por dimensão (Fernando) + report BFAS validado (modelo de devolutiva)
  - `icar60/` — PESQUISA #1 + alternativas BR
  - `sjt/` — PESQUISA #3 + exemplos plataformas
  - `prompts/` — PESQUISA #5 + 8 templates prontos + Zod schemas + Edge Function reference + LGPD audit guide
- `Pesquisas/sistema-avaliacao-candidatos-recrutamento/PESQUISA-sistema-avaliacao-candidatos-recrutamento.md` [PESQUISA principal] + benchmark 7 plataformas
- `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`

**Status v0.2 (pós deep researches):** 4/4 deep researches confirmaram instrumentos + prompts. Materiais Big Five do Fernando depositados (NotebookLM curso + 5 Word docs + report BFAS validado). 3 decisões anteriormente abertas agora lockadas: agendamento via **Microsoft Bookings** (M365 nativo), devolutiva Big Five **qualitativa por dimensão + texto interpretativo** inspirada no formato BFAS validado, **arquitetura RAG via `docs/conhecimento/`** com prompts versionados e auditoria LGPD. Próximo: criar 5 mini-PRDs derivados (ver §15) e abrir M2 via `/gsd-discuss-phase`.

---

## 1. Problema & Contexto

### 1.1 Problema central

> "Hoje o RH da Beauty Smile não tem como triar, comparar e decidir sobre candidatos num único sistema rastreável. Após o candidato se cadastrar e se candidatar (M1 entregue), o processo cai num buraco: planilhas, WhatsApp, emails manuais, scores subjetivos sem critério registrado, decisões sem trilha de auditoria. O resultado é tempo de contratação alto, candidatos somem entre etapas, gestores recebem perfis fracos na entrevista, e não existe defesa para reclamações LGPD ou trabalhistas." — Beauty Smile, contexto de negócio

### 1.2 Evidências

- **Documentação existente** [PRD-MASTER v1.2 §3]: time-to-hire baseline desconhecido, target = "< 10 dias úteis triagem → decisão final"
- **Validade preditiva**: pesquisa científica [PESQUISA §3] confirma que a composição ótima é **Entrevista estruturada + Work Sample + SJT** (r ≈ .50-.60) com baixo adverse impact — superior aos testes psicométricos puros que dominavam o PRD original
- **Adverse impact**: cognitivo isolado (Raven-style) tem d=1.0 Black-White [PESQUISA §10.2] — risco legal alto sem mitigação
- **Convergência de plataformas**: 7 plataformas analisadas (TestGorilla, Vervoe, Canditech, HireVue, Mettl, Willo, Growhire) [PESQUISA fontes/*] convergem em assíncrono filtra → síncrono confirma → humano decide; nenhuma reverteu essa ordem
- **LGPD + Lei 9.029/95**: forms iniciais que pedem foto/nascimento/CPF expõem a R$50M LGPD + 10× maior salário Lei 9.029 [PESQUISA §1]
- **Erro caro**: HireVue perdeu US$365k em processo EEOC (2023) por auto-rejeição IA antes de revisão humana [PESQUISA §5.2]
- **Anti-pattern do design original**: PRD v1.2 propunha pipeline de 8 etapas com `testes_async` paralelo agrupando testes de baixa validade preditiva (Big Five r=.19) como eliminatórios — pesquisa rejeita esse approach por arquitetura de custo (gasta tempo de candidato sem ganho avaliativo)

### 1.3 Contexto histórico

- **2025-10**: sistema iniciado em Figma Make, modo firefighting até nov/2025. Resultado: 43 arquivos WIP em `backup/local-state-2026-04`, service_role exposto no client, auth duplicado, kanban legado com enum `etapa_processo` quebrado
- **2026-04**: M1 (MVP Candidato — Phases 1-5) entregue: foundation saneada, cadastro, login, vagas, candidatura ponta-a-ponta com Edge Functions e RLS hardened
- **Phase 4 (vagas + candidatura)**: candidato hoje insere candidatura em `etapa_atual='triagem'` + `status='aguardando_resposta'` — isso é o **handoff** para o M2
- **Pipeline antigo (10 etapas seriais com Raven, Cultura como etapa, todos os testes eliminatórios)** segue no banco mas nunca foi exercido (zero candidaturas avançaram além de `triagem`). **Será deprecado neste M2** via migration controlada

---

## 2. Objetivos & Métricas

### 2.1 Objective (OKR)

```
Objective: O RH da Beauty Smile triar, avaliar e decidir sobre candidatos
num único sistema rastreável, com tempo de contratação reduzido em 40%+
e zero risco LGPD/trabalhista.

- KR1: Triagem RH conclui em ≤ 48h em ≥ 80% das vagas (prazo: 90 dias pós-MVP)
- KR2: Time-to-hire (triagem → decisão final) ≤ 10 dias úteis em ≥ 70% das vagas (prazo: 6 meses)
- KR3: 100% das decisões humanas têm justificativa registrada e auditoria LGPD Art. 20-ready (prazo: dia do MVP)
- KR4: Zero candidatos rejeitados automaticamente por trait (apenas knock-outs objetivos) (prazo: dia do MVP — guardrail)
```

### 2.2 Métrica Primária

| Métrica | Atual | Meta | Prazo | Como Medir |
|---------|-------|------|-------|-----------|
| Time-to-hire (dias úteis triagem → decisão) | desconhecido (sem instrumentação) | ≤ 10 dias em ≥ 70% das vagas | 6 meses pós-MVP | `(decisao_final.created_at - candidatura.data_aplicacao) / business_days` em report mensal |

### 2.3 Métricas Secundárias

| Métrica | Atual | Meta | Prazo | Tipo | Como Medir |
|---------|-------|------|-------|------|-----------|
| % candidaturas que avançam de `triagem` para etapa 3 (vs rejeitadas/abandonadas) | n/a | 30-50% | 3 meses | Leading | Funnel report `historico_candidatura` |
| % conclusão da Etapa 3 (avaliação assíncrona) | n/a | ≥ 70% dos convocados | 3 meses | Leading | `scores_candidato` existência por candidato |
| Tempo médio do candidato em Etapa 3 (envio do bloco) | n/a | ≤ 5 dias úteis | 3 meses | Leading | `scores_candidato.created_at - etapa_iniciada_em` |
| Rate de aprovação de candidatos sugeridos pela IA vs total | n/a | medir, sem alvo (calibration) | 6 meses | Lagging | comparar `recomendacao_ia.score_match` × `decisao_final.aprovado` |
| Custo médio de IA por candidato no funil completo | n/a | ≤ R$ 0,50/candidato | 6 meses | Lagging | Anthropic API billing × candidatos no período |

### 2.4 Métricas Guardrail (NÃO podem piorar)

| Métrica | Valor Atual | Limite Mínimo Aceitável | Como Monitorar |
|---------|-------------|------------------------|----------------|
| Selection rate por raça/gênero/idade (regra 4/5 EEOC) | n/a (auditoria nova) | Selection rate de qualquer grupo demográfico ≥ 80% do grupo de maior taxa | Bias audit mensal manual via export CSV → AIF360/Fairlearn |
| Rejeições automáticas por trait | 0 (não existe) | **0** (qualquer rejeição auto por trait = bug crítico) | Edge Function lógica + auditoria de logs `rejeicoes` |
| % de candidaturas avaliadas sem revisão humana | 0 | **0%** (toda decisão IA é recomendação, não decisão) | Validação: `decisao_final.por_usuario IS NOT NULL` em 100% dos casos |
| Latência da UI Comparativo (P95) | n/a | ≤ 5s (UX aceitável para análise pesada) | Logging em Edge Function `comparativo-candidatos` |
| Disponibilidade da API Anthropic durante uso | n/a | ≥ 99% (fallback documentado se queda) | Cron health-check + circuit breaker |
| Score subjetivo do RH em UAT trimestral | n/a | ≥ 4/5 (UX aceitável) | Survey trimestral |

---

## 3. Escopo

### 3.1 v1 — MVP M2 (estimativa: 8-12 semanas)

**DB / Schema**
- Migration controlada: deprecar enum `etapa_processo` antigo (10 valores) → reconstruir como **6 etapas** (`inscricao` → `triagem` → `avaliacao_assincrona` → `entrevista_online` → `entrevista_presencial` → `decisao_final`) com 2 estados terminais (`aprovado`, `rejeitado`)
- 10+ tabelas novas: `pergunta_opcao_metadata`, `vaga_testes_aplicaveis`, `vaga_etapas_presenciais`, `analise_candidato_vaga`, `comparativo_solicitado`, `scores_candidato`, `redacoes_candidato`, `entrevistas_candidato`, `decisao_final`, `historico_candidatura` (auditoria), `bias_audit_log`
- RLS em 100% das tabelas (admin RH + admin sistema + candidato sobre próprio dado)
- Trigger PL/pgSQL `avancar_etapa()` em `UPDATE candidaturas SET status='aprovado_proxima'`

**Edge Functions (core do funil)**
- `analise-candidato-individual` — trigger no INSERT candidatura, gera resumo CV + análise match + score_match (0-100)
- `comparativo-candidatos` — endpoint POST chamado pela UI RH com array de candidaturas, devolve ranking + justificativa
- `gerar-guia-entrevista` — POST com vaga_id + candidatura_id, devolve guia STAR/PEI customizado
- `avaliar-redacao` — POST com texto + rubric, devolve scores BARS por dimensão + citações
- `avaliar-transcricao-entrevista` — POST com transcrição + rubric, devolve scores BARS + flags
- `consolidar-decisao-final` — POST com candidatura_id, devolve dashboard agregado (não re-pontua)

**UI RH (`/rh/*`)**
- Painel de candidatos por vaga (lista + filtros + checkbox + score_match + botão Comparar)
- Tela de comparativo (até 10 candidatos lado-a-lado, ranking IA + justificativas + export PDF)
- Kanban de candidatos por vaga (6 colunas, drag-drop opcional, bloqueio de regressão sem justificativa)
- Tela de configuração de vaga (templates por cargo + override de pesos + perguntas customizadas + tags por opção)
- Tela individual do candidato (timeline de etapas + scorecards por etapa + redação + transcrições + decisão)
- Tela de criação de pergunta com **wizard de tags** (knockout/atencao/neutro/pontua/fortemente_pontua + peso + nota_ia)
- Tela de geração e revisão do guia de entrevista (online + presencial)
- Tela de input de transcrição de entrevista (paste manual + análise IA inline)
- Dashboard RH com métricas SLA + alertas

**Fluxo Candidato (`/candidato/*`)**
- Tela de avaliação assíncrona (bloco único: Work Sample/SJT + Big Five + Redação cultural) com timer + autosave + bloqueio de back após avançar
- Tela de redação cultural (textarea com contador 200-500 palavras)
- Notificações in-app + email (via n8n) de mudança de etapa

**Integração IA**
- Library de 7 prompts versionados (system prompt + user message + Zod output schema por uso)
- Logging estruturado obrigatório: prompt_version, model_version, generated_at, input_hash, output, custo_tokens
- Cache de prompts via Anthropic prompt caching para vaga + rubric (parte estável do contexto)

**LGPD / Bias**
- Form Etapa 1 LGPD-clean (sem foto, nascimento, CPF, estado civil, saúde) — auditar form atual e sanear
- Tabela `bias_audit_log` com snapshot mensal de selection rate por demografia
- Edge Function `lgpd-explicacao-candidato` — endpoint para LGPD Art. 20 (candidato pede explicação de rejeição automatizada e revisão humana)
- Política: 100% das decisões finais têm `por_usuario` + `justificativa` (NOT NULL) — enforced via RLS

### 3.2 v2 (após validação) — estimativa: +6-12 semanas

- Bias audit **automatizado** (cron + dashboard interno + alertas se regra 4/5 violada)
- LLM-as-judge com **calibração contínua** (RH pontua N candidatos manualmente, IA aprende preferência da clínica — Vervoe-style)
- ~~ICAR60 aplicado online~~ → **promovido para v1**: a prova de raciocínio CC0 já nasce online com proctoring leve (ver `PRD-cognitivo-raciocinio.md`). O que resta para v2 é a **norma local** (N≥200) + validação criterial
- Dashboard de fairness exposto ao admin (não só ao auditor)
- Geração de carta de devolução personalizada por IA (LGPD-friendly, sem expor critério interno)
- Workflow n8n para SLA: notificação automática a candidatos parados em etapa há > X dias (cadência configurável)

### 3.3 v3 (futuro)

- Integração com calendar (Google/Outlook) para agendamento direto de entrevistas
- WhatsApp Business API integrado (notificações + chat estruturado com candidato) — substitui n8n manual
- Onboarding handoff: candidato `aprovado` migra dados para `funcionarios` (sistema externo) via API
- IA generativa para escrita de descrição de vaga (a partir de bullet points do RH)
- Análise preditiva de retenção (90 dias pós-contratação) cruzando scorecard × performance real (loop de calibração)
- Multi-tenant (se Beauty Smile expandir para gerir RH de outras clínicas / franquias)

---

## 3b. Fora do Escopo

| Item | Razão | Consideração Futura |
|------|-------|---------------------|
| **DISC obrigatório** | Validade preditiva próxima de zero (PESQUISA §3); popular no Brasil só por escapar SATEPSI/CFP. Mantido como **opt-in para liderança** apenas | v2: revisar uso real e decidir se vale manter como opcional |
| **Análise facial / vídeo da entrevista** | Caso clássico de destruição de reputação (HireVue legacy). EU AI Act (fev/2026) proibirá. Proibido por princípio | Nunca |
| **Auto-rejeição por trait/score** | Viola RNF-07a (decisão humana sempre) e expõe a EEOC/LGPD. IA é sempre RECOMENDAÇÃO | Nunca |
| **Detecção de ChatGPT em redação** | Pesquisa confirma <80% confiabilidade + alta taxa de falso positivo para não-nativos. Mitigação correta = follow-up ao vivo na entrevista online (Etapa 4) | Nunca como detector; sempre como follow-up humano |
| **Raven Progressive Matrices** | SATEPSI-desfavorável desde 2023 + licença Pearson inviável + adverse impact alto (d=1.0 Black-White) | Nunca — substituído por prova de raciocínio CC0 |
| **ICAR60 como instrumento** | Deep Research #1 confirmou 4 bloqueios: licença non-commercial + zero validação PT-BR + fora do SATEPSI + sem normas BR. Inviável em produção comercial | Nunca — só itens CC0 avulsos do dataset Harvard Dataverse, reposicionados como prova técnica não-psicológica |
| **Cultura como etapa separada do funil** | Pesquisa rejeita "culture-fit AI scoring" — vira discriminação. Cultura vira **dimensão dentro da redação** avaliada por IA + follow-up na entrevista | Nunca |
| **n8n no core do funil (decisões avaliativas)** | Workflows de decisão precisam viver no Git com auditoria estrita. n8n é externalidade frágil para auditoria LGPD | Nunca para core; permitido para periféricas |
| **Multi-tenant** | Beauty Smile single-tenant (uma rede). Sem `tenant_id` em tabelas | v3 se expansão |
| **App mobile nativo do RH** | SPA responsiva atende; RH usa desktop primariamente | Nunca |
| **Sentry** | Vercel Runtime Logs nativos atendem volume previsto; complexidade extra não justificada | v3 se volume justificar |
| **Banco completo de SJT pronto para todos os cargos no MVP** | Criar SJT customizado leva 2-4h por cargo (precisa SME odontológico). MVP entrega 1-2 SJT por cargo, banco cresce em v2 | v2: expandir para 3-5 SJT por cargo + variação por nível |
| **Subescala verbal / rotação 3D no cognitivo** | Verbal = adverse impact ALTO (d 0,8–1,0+) + tradução PT-BR custosa; 3D = assets pesados, baixa cobertura p/ cargos-alvo. Cognitivo V1 é só matriz + letra-número (não-verbal) | Verbal nunca neste contexto; 3D em v3 se houver cargo técnico-espacial |
| **Onboarding pós-contratação no sistema** | Out of scope do recrutamento; integração futura | v3 |

---

## 4. Personas & Jornadas

### Persona 1: RH (Sara — Coordenadora de Recrutamento)

- **Quem**: Coordenadora de RH da Beauty Smile, 30-45 anos, ensino superior em RH/Psicologia, gerencia sozinha ou com 1-2 assistentes ~50 vagas/ano em todas as clínicas da rede
- **Motivação**: Contratar bem e rápido, com defesa para reclamação trabalhista/LGPD; reduzir trabalho manual em planilhas
- **Frustração atual**: Planilhas Google + WhatsApp + email + PDF de teste = caos. Não consegue comparar candidatos lado a lado. Quando gestor pede "me explica por que esse foi rejeitado", não tem trilha
- **Frequência de uso**: Diária (tempo médio: 2-4h/dia)

**Jornada atual (AS-IS):**
1. Recebe candidaturas via Google Forms → exporta CSV → cola na planilha
2. Lê CV de 30 candidatos manualmente, marca "sim/não/talvez" em coluna
3. Manda email para top 10 com link para teste (Big Five PDF)
4. Recebe PDFs via email, abre cada um, anota score em outra coluna
5. Marca entrevistas via WhatsApp individual com cada candidato
6. Anota notas de entrevista em caderno físico
7. Manda email de aprovação/rejeição manualmente
8. Sem trilha estruturada se um candidato reclamar

**Jornada futura (TO-BE):**
1. Abre `/rh/vagas/[id]/candidatos` → vê 30 candidatos pré-ranqueados pela IA com `score_match`
2. Marca top 10 → clica "Comparar selecionados" → tela de comparação aparece em ≤ 5s com tabela ranqueada
3. Clica em candidato → vê timeline de etapas + scorecard agregado
4. Clica "Avançar para Etapa 3" → sistema notifica candidato automaticamente
5. Quando todos concluírem Etapa 3, abre comparativo de novo (agora com scores de Work Sample + Big Five + Redação)
6. Clica "Gerar guia de entrevista" → recebe roteiro STAR customizado pra cada candidato finalista
7. Após entrevista, cola transcrição → IA pontua contra rubric → consolida com etapas anteriores
8. Decide com 1 clique + justificativa textual (obrigatória, mínimo 50 caracteres)
9. Sistema arquiva trilha completa para auditoria LGPD

### Persona 2: Gestor de Clínica (Dr. Pedro — Dentista responsável por 1 unidade)

- **Quem**: Dentista coordenador de clínica específica, 35-55 anos, decide quem entra no time da unidade dele
- **Motivação**: Contratar pessoas que se encaixam no time e na cultura humanizada da Beauty Smile
- **Frustração atual**: Recebe candidatos da Sara (RH) sem contexto suficiente; entrevista na cara fria; depois descobre na semana de teste freela que não combina
- **Frequência de uso**: Episódica (2-4 vezes/mês quando há vaga aberta na unidade)

**Jornada atual (AS-IS):**
1. Sara avisa "vou te mandar um candidato pra entrevista quarta às 14h"
2. Recebe nome + telefone + nada mais
3. Entrevista 30min sem material de referência
4. Decide na intuição

**Jornada futura (TO-BE):**
1. Recebe email/notificação com link `/rh/candidato/[id]` 24h antes da entrevista
2. Abre e vê: resumo CV (gerado por IA), score_match, scorecards das etapas anteriores, redação cultural com análise BARS, **guia de perguntas customizado pra essa entrevista** (gerado por IA priorizando dimensões fracas)
3. Conduz entrevista com guia em mão
4. Pontua dimensões na própria UI durante a entrevista (scorecard rápido)
5. Junta com Sara depois pra decisão consensual

### Persona 3: Candidato (já validada em M1, herdada)

- **Mudanças vs M1**: agora candidato precisa fazer Etapa 3 (avaliação assíncrona ~60min) e Etapa 5 (presencial ~110min) — fluxo de **convite por etapa** + notificação push/email a cada avanço
- Frustração nova mitigada: sistema avisa em qual etapa está + tempo médio de resposta ("Sara revisa em até 48h"), reduzindo ansiedade

---

## 5. User Stories & Epic Hypotheses

### Épico 1: Triagem com IA + Comparativo

**Hipótese:**
```
Se nós oferecermos análise individual automática de cada candidatura
(score_match + resumo CV + análise vs vaga) gerada na hora da inscrição,
para a Sara (RH), então ela conseguirá triar 30 candidatos em ≤ 30min
(vs 4h hoje), mantendo qualidade da decisão.
Saberemos que funcionou quando: tempo médio de triagem por vaga ≤ 30min
em ≥ 80% dos casos + score subjetivo de qualidade ≥ 4/5 em UAT trimestral.

Tiny Act of Discovery: rodar IA em 5 vagas históricas (com decisão já tomada manualmente),
comparar ranking IA × ranking manual da Sara — se concordância > 70% nas top-10,
hipótese validada.
```

| ID | Como... | Quero... | Para... | Prioridade |
|----|---------|----------|---------|------------|
| US-01 | RH | ver score_match (0-100) + resumo IA de cada candidato no painel | triar rapidamente sem ler CV inteiro | Must |
| US-02 | RH | selecionar 3-10 candidatos e clicar "Comparar" | tomar decisão informada entre finalistas | Must |
| US-03 | RH | ver justificativa textual da IA por candidato no comparativo | confiar (ou questionar) o ranking | Must |
| US-04 | RH | exportar comparativo em PDF | enviar para gestor de clínica | Should |

### Épico 2: Avaliação Assíncrona Estruturada (Etapa 3)

**Hipótese:**
```
Se nós entregarmos para o candidato um bloco único de 60min (Work Sample/SJT
customizado por cargo + Big Five + Redação cultural), com timer + autosave +
bloqueio de back após avançar, então ≥ 70% dos candidatos convocados concluirão
o bloco em ≤ 5 dias úteis, com score útil para decisão.
Saberemos que funcionou quando: taxa de conclusão ≥ 70% + tempo médio ≤ 5 dias
+ score de Work Sample correlaciona r ≥ .30 com decisão final do gestor.

Tiny Act of Discovery: aplicar SJT em formato Google Forms para 10 candidatos
de 1 vaga real ANTES de construir UI completa — validar se completam em
≤ 60min e se respostas têm sinal avaliativo.
```

| ID | Como... | Quero... | Para... | Prioridade |
|----|---------|----------|---------|------------|
| US-05 | Candidato | fazer SJT com cenários realistas do cargo | mostrar minha capacidade prática | Must |
| US-06 | Candidato | salvar progresso e continuar depois | não perder tudo se internet cair | Must |
| US-07 | Candidato | ver tempo estimado de conclusão | me organizar | Should |
| US-08 | RH | ver scorecard estruturado (BARS) por dimensão pra cada candidato | comparar com critério objetivo | Must |
| US-09 | RH | configurar perguntas customizadas por vaga (com tags em opções) | adaptar avaliação ao cargo | Must |

### Épico 3: Entrevista Online com IA Companion

**Hipótese:**
```
Se nós gerarmos guia de entrevista customizado (5-7 perguntas STAR/PEI baseadas
em vaga + scorecard prévio do candidato + dimensões fracas) e analisarmos
transcrição colada manualmente contra rubric BARS, então gestor + RH conduzirão
entrevistas mais ricas com decisão mais consensual e justificada.
Saberemos que funcionou quando: 100% das entrevistas têm guia + scorecard
+ justificativa registrados; concordância entre RH e gestor (IRR) > 0.70.

Tiny Act of Discovery: gerar guia para 3 vagas reais e mostrar ao gestor
ANTES de construir UI — perguntar se ele realmente usaria.
```

| ID | Como... | Quero... | Para... | Prioridade |
|----|---------|----------|---------|------------|
| US-10 | RH/Gestor | gerar guia de entrevista customizado | conduzir entrevista estruturada | Must |
| US-11 | RH | colar transcrição da entrevista no sistema | obter análise BARS automática | Must |
| US-12 | Gestor | ver dashboard do candidato 24h antes da entrevista | chegar preparado | Must |

### Épico 4: Decisão Final Auditável

**Hipótese:**
```
Se nós consolidarmos automaticamente todos os scorecards em dashboard único
e exigirmos justificativa textual de toda decisão final, então a Beauty Smile
terá defesa LGPD/trabalhista e o RH terá decisão mais rápida.
Saberemos que funcionou quando: 100% das decisões têm justificativa
(NOT NULL no DB) + zero reclamações LGPD em 12 meses + tempo de decisão
final ≤ 15min por candidato.
```

| ID | Como... | Quero... | Para... | Prioridade |
|----|---------|----------|---------|------------|
| US-13 | RH | ver dashboard consolidado por candidato (todas etapas + scores agregados) | decidir com visão completa | Must |
| US-14 | RH | aprovar/rejeitar com justificativa obrigatória | manter trilha auditável | Must |
| US-15 | Candidato rejeitado | pedir explicação da rejeição (LGPD Art. 20) | exercer direito legal | Must |

### 5.1 Critérios de Aceite Detalhados (amostra)

**US-02: Comparativo on-demand entre candidatos**

```
Cenário 1: comparativo feliz (3-10 candidatos)
  Given uma vaga ativa com 15 candidaturas e Sara logada como rh
  When Sara marca 5 candidatos no painel e clica "Comparar selecionados"
  Then o sistema chama Edge Function comparativo-candidatos
  And exibe loading spinner por máx 5s (P95)
  And renderiza tabela com 5 linhas + colunas: nome, score_match, pontos_fortes,
      gaps, ranking_relativo (1-5), justificativa_ia
  And persiste registro em comparativo_solicitado para auditoria

Cenário 2: comparativo com 11+ candidatos selecionados
  Given Sara seleciona 11 candidatos
  When tenta clicar "Comparar"
  Then botão fica desabilitado
  And toast mostra "Selecione no máximo 10 candidatos para comparar"

Cenário 3: comparativo falha (Anthropic API indisponível)
  Given Sara marca 5 candidatos e clica "Comparar"
  When Edge Function falha por API down (status 503)
  Then sistema mostra erro claro: "Serviço de análise temporariamente indisponível.
      Tente em alguns minutos."
  And NÃO grava em comparativo_solicitado (transação atômica)
  And log estruturado em telemetria para alerta interno
```

**US-14: Decisão final com justificativa obrigatória**

```
Cenário 1: aprovação com justificativa válida
  Given candidatura na etapa entrevista_presencial com todos scorecards preenchidos
  When Sara clica "Aprovar candidato" e digita justificativa de 80 caracteres
  Then sistema persiste em decisao_final {aprovado: true, justificativa, por_usuario: auth.uid(), em: now()}
  And atualiza candidaturas {etapa_atual: 'aprovado', status: 'finalizado'}
  And dispara n8n workflow "envio_carta_aprovacao" (assíncrono)

Cenário 2: tentativa de aprovar sem justificativa
  Given mesma candidatura
  When Sara clica "Aprovar" com campo justificativa vazio
  Then botão fica desabilitado
  And tooltip explica "Justificativa obrigatória (mínimo 50 caracteres) para auditoria LGPD"

Cenário 3: candidato pede explicação LGPD Art. 20 após rejeição
  Given candidatura rejeitada há 5 dias
  When candidato acessa /candidato/explicacao/[candidatura_id]
  Then sistema exibe: motivo da rejeição (textual), quem decidiu (nome do RH),
      data, score_match, opção "Solicitar revisão por pessoa natural"
  And se clicar "Solicitar revisão", abre ticket interno + notifica RH responsável
```

---

## 6. Requisitos Funcionais

### 6.1 Etapa 1 — Inscrição + Knock-out

| ID | Requisito | Critério de Aceite | Prioridade | US |
|----|-----------|-------------------|------------|------|
| RF-01 | Form de inscrição: nome, email, telefone, CEP, LinkedIn, **data de nascimento**, disponibilidade início, pretensão salarial, nível de inglês, "como conheceu a vaga", Instagram (por cargo). **Removidos vs sistema legado:** "fontes de renda", "por que você trabalha", "prioridades atuais", gate "seguir 3 perfis" (minimização LGPD + redundância com Etapa 3). **Sem CPF/foto/estado civil/saúde.** | Validação Zod client+server. ⚠️ **Decisão 2026-06-06:** data de nascimento É coletada e **visível na triagem** (escolha consciente de Fernando, risco de discriminação por idade aceito) — RNF-07b deve monitorar faixa etária na auditoria de viés como trilha de defesa. Instagram é campo por-template (obrigatório p/ SDR/Social Seller e Consultor; opcional/oculto p/ dentista/financeiro). | Must | — |
| RF-01a | **(NOVO 2026-06-06)** Bloco de **qualificação estruturada por template de cargo** na Etapa 1 (respondido por todos na inscrição): campos estruturados (dropdown/single/multi-choice) que (a) eliminam ou (b) informam fortemente `score_match`. Substitui a "qualificação técnica" que o Form 2 do sistema legado coletava (`docs/conhecimento/perguntas-vagas.md`). | **Regra de ouro:** máx **10 perguntas de qualificação por cargo**, das quais **no máx. 1 aberta** (idealmente 0 — abertas ficam na Etapa 3); Etapa 1 inteira cabe em ~10 min (teto 15 min). Campos viram input estruturado para a IA da Etapa 2 + filtros do painel RH (RF-07). Profundidade fina (inventário de ferramentas) NÃO é coletada aqui — vem do CV (Etapa 2) + cases (Etapa 3). Schema novo `vaga.qualificacao_etapa1` jsonb (espelha padrão de `vaga.testes_aplicaveis`). Exemplos por cargo: Dentista (tempo exp. clínica · top-3 procedimentos · laser S/N · especialização); Consultor (anos venda consultiva · setor saúde S/N · ticket médio · taxa conversão); SDR (atend. digital S/N · ligações/dia · CRM); Financeiro (anos área · ERP · nível Excel · fechamento mensal S/N). | Must | US-09 |
| RF-02 | Knock-out questions configuráveis por vaga (binárias, single_choice) | Admin marca cada opção com tag (`knockout`/`atencao`/`neutro`/`pontua`/`fortemente_pontua`) + peso int + nota_ia text; obrigatório se ALGUMA opção tem tag=knockout. **Knockouts padrão (2026-06-06):** (1) **"Disponibilidade para trabalhar presencialmente em SP (Brigadeiro/Paraíso)?" → Não = knockout** (clínica 100% presencial) — aplicável a todos os cargos; (2) **"Ciente que não realizamos harmonização orofacial?" → Não = knockout** (apenas dentista). | Must | — |
| RF-03 | Auto-rejeição imediata se candidato selecionar opção com `tag='knockout'` | candidatura é gravada com `status='rejeitado'` + `etapa_atual='inscricao'` + motivo='knockout_automatico' + opcao_knockout_id; candidato vê mensagem "Infelizmente não atendemos os critérios desta vaga no momento" | Must | — |
| RF-04 | Auditoria de toda auto-rejeição em `historico_candidatura` com campo `auto_rejeitado=true` | Query SQL retorna 100% das auto-rejeições com criterio textual + opcao_id + data | Must | — |

> **📌 Nota de design — Etapa 1 reespecificada a partir do funil legado (2026-06-06).** Análise dos 6 formulários reais (`docs/conhecimento/perguntas-vagas.md`) mostrou que o sistema antigo era um **funil de 2 portões**: Form 1 (leve, todos) → pré-seleção manual → Form 2 (pesado 15-20 min, só pré-selecionados, misturando qualificação técnica + cenários SJT + redação de valores). **Mapeamento no M2:** Form 1 → **Etapa 1**; pré-seleção manual → **Etapa 2 (Triagem RH com IA)**; Form 2 (b) cenários SJT → **Etapa 3 SJT/Work Sample**; Form 2 (c) redação → **Etapa 3 Redação fit-cultural**; Form 2 (a) qualificação técnica → **Etapa 1 bloco de qualificação (RF-01a, Opção 1 enxuta)**. O M2 preserva o funil de 2 portões e o torna auditável + assistido por IA. Big Five e Raciocínio lógico são instrumentos NOVOS (não existiam no legado).

### 6.2 Etapa 2 — Triagem RH com IA

| ID | Requisito | Critério de Aceite | Prioridade | US |
|----|-----------|-------------------|------------|------|
| RF-05 | Trigger automático no INSERT de candidatura (que passou knock-outs) chama Edge Function `analise-candidato-individual` | Em ≤ 30s após INSERT, existe row em `analise_candidato_vaga` com `generated_at` populado | Must | US-01 |
| RF-06 | Edge Function gera: resumo_cv (3-4 parágrafos), resumo_respostas (jsonb), pontos_fortes (text[]), gaps (text[]), score_match (0-100), flags (text[]) | Output validado por Zod schema antes de gravar | Must | US-01 |
| RF-07 | Painel RH `/rh/vagas/:id/candidatos` lista candidaturas com colunas: foto-placeholder, nome, score_match, pontos_fortes (top 2), gaps (top 2), data_aplicacao, etapa_atual | Paginação 20/página; ordenação default por score_match DESC; filtros por etapa + status | Must | US-01 |
| RF-08 | Botão "Comparar selecionados" habilita quando 2-10 candidatos checkados | Desabilitado se < 2 ou > 10; tooltip explica razão | Must | US-02 |
| RF-09 | Edge Function `comparativo-candidatos` recebe `{vaga_id, candidatura_ids[]}` e retorna ranking + justificativa relativa | P95 ≤ 5s; resultado persistido em `comparativo_solicitado` (audit) | Must | US-02 |
| RF-10 | Tela de comparativo renderiza tabela com até 10 colunas: candidato, score_match (estável), ranking_relativo (1-N), pontos_fortes, gaps, justificativa_ia, ação (avançar/rejeitar) | Export PDF disponível; permite ação direta na tabela | Must | US-02, US-03 |

### 6.3 Etapa 3 — Avaliação Assíncrona

| ID | Requisito | Critério de Aceite | Prioridade | US |
|----|-----------|-------------------|------------|------|
| RF-11 | Vaga configura `vaga.testes_aplicaveis` jsonb: lista de testes ativos {teste, obrigatorio, customizado, perguntas?} | Default por template do cargo; admin override; validação que pelo menos 1 teste está marcado obrigatório | Must | US-09 |
| RF-12 | Tela `/candidato/avaliacao/[candidatura_id]` mostra todos testes pendentes com tempo estimado | Candidato escolhe ordem; cada teste salvo independentemente | Must | US-05, US-07 |
| RF-13 | Work Sample/SJT múltipla escolha pontua via somatório dos pesos das opções marcadas (sem IA), **escala graduada 4/2/1/0** (`fortemente_pontua`=4 · `pontua`=2 · `neutro`=1 · `atencao`=0+flag). **Detalhes:** [`PRD-sjt-work-sample-odontologia.md`](./PRD-sjt-work-sample-odontologia.md) | Score_sjt = Σ peso(opcao_marcada); persistido em `scores_candidato` (tipo='sjt'); threshold `< 60% do máx OU ≥1 atencao` → revisão humana (nunca auto-rejeita) | Must | US-08 |
| RF-14 | Work Sample/SJT case aberto / work-sample / in-basket (dentista, consultor de vendas, SDR, assistente financeiro) avaliado por `avaliar-redacao` com rubric BARS (template `07-work-sample-sjt`: inclusion/exclusion + Cite Before You Speak). **Detalhes:** [`PRD-sjt-work-sample-odontologia.md`](./PRD-sjt-work-sample-odontologia.md) | Output BARS 0-25 + citações + red_flags Zod-validado; threshold `< 13/25 OU red flag` → revisão humana | Must | US-08 |
| RF-15 | Big Five **IPIP-NEO-120 PT-BR** ([item bank](../../conhecimento/big-five/fontes/ipip-neo-120-questions-pt-br.json), 120 itens Likert 1-5, Johnson 2014 scoring, normas internacionais embutidas). Scoring engine **TS port inline** na Edge Function Deno (~150 linhas, baseado em [`bigfive-web`](https://github.com/rubynor/bigfive-web) MIT) com cross-check em CI vs [`five-factor-e`](https://github.com/NeuroQuestAi/five-factor-e) Python (Δ ≤ 0.01 em fixture de 10 perfis sintéticos). Schema agnóstico de instrumento via `scores_candidato.metadata.instrumento` permite Plan B BFI-2 PT-BR (Pires 2023, pivot 1-2 dias). **Detalhes:** [`PRD-bigfive-revisado.md`](./PRD-bigfive-revisado.md) | Output: 5 dimensões OCEAN com `{raw, t_score, percentile, level}` + 30 facetas + `norm_group_used`; persistido em `scores_candidato` com `tipo='big_five'` e `metadata jsonb` populado | Must | — |
| RF-16 | Redação fit cultural (v1.1 — substitui v1.0): 1 pergunta padrão Beauty Smile (`PADRAO_BS` — **Opção B** "cuidar de pessoa em fragilidade/dúvida/insatisfação") + **1-2 customizáveis por template de cargo** (junior=1, sênior=2), banco seedado de **12 templates 3-por-cargo** (D1-D3 dentista, R1-R3 recepção+ASB, C1-C3 coord+admin+gestor, F1 freela) com defaults ON/OFF. 200-500 palavras **hard min/max** (sem soft max V1). Cronômetro informativo (sem timer rígido). Autosave 30s local + **30s DB sync** via `redacoes_candidato_em_progresso`. **Detalhes:** [`PRD-redacao-fit-cultural.md v1.1`](./PRD-redacao-fit-cultural.md) | Validação client + server (hard 200-500 ambos lados); seed em `perguntas_redacao` (13 rows = 1 PADRAO_BS + 12 customizáveis) + extensão de `vaga.testes_aplicaveis` jsonb com `{tipo:'redacao', perguntas_codigos:[], threshold_cor:{vermelho_max, amarelo_max}}` | Must | — |
| RF-17 | Redação avaliada por `avaliar-redacao` em 4 dimensões BARS (especificidade · ação · aprendizado · alinhamento valores) com **pesos iguais 25% V1** (calibrar V2 com Cohen's κ — pesos por cargo viram referência V2). **3 caps especiais determinísticos**: (a) `red_flag_etico=true → score_geral=MIN(score, 30)` + revisão humana obrigatória; (b) `D1≤2 → score_geral=MIN(score, 50)` + flag `situacao_generica_ou_inventada`; (c) `insufficient_evidence` apenas para `word_count<200 OR fora_do_tema OR prompt_injection`. **Sistema 3 cores classificação**: 🟢 verde ≥65 / 🟡 amarelo 41-64 / 🔴 vermelho ≤40 OR `red_flag_etico` OR `D1≤2`. **Few-shot inline cacheado** com 3 exemplos calibrados (Nível 1 Camila / Nível 3 Rodrigo / Nível 5 Mariana) — `cache_control: ephemeral`. Style neutralization Rao 2025 + Cite Before You Speak + bias_audit obrigatório (template `06-culture-fit-essay-v1.0`). **Hash sha256 anti-plágio intercandidato** (V1 só flag `possivel_plagio_intercandidato`, sem bloqueio automático). **Detalhes:** [`PRD-redacao-fit-cultural.md v1.1`](./PRD-redacao-fit-cultural.md) | Output Zod-validado (`EssayScoringV1Schema`) com score 1-5 ou `insufficient_evidence` por dim + `cited_evidence[]` + `score_ponderado_0_100` + `classificacao_cor` + `red_flag_etico:boolean` + `flags[]` + `bias_audit{}` + `referencia_match[]`; persistido em `redacoes_candidato` (1 row por par candidatura×pergunta) com `bloqueio_avanco=true` se vermelho + audit completo | Must | — |
| RF-17a | Revisão humana **sempre obrigatória** após análise IA (status `pendente_humano`). UI: **1 redação por vez** com sidebar de pendentes filtrada por cor (vermelho > amarelo > verde) + atalhos teclado (J/K/A/R/D), sliders override `scores_humanos`, `notas_revisor ≥ 50 chars`, `decisao_revisor` (aprovado/reprovado/duvida). Decisão "duvida" escala pro gestor da vaga via n8n. **Sem devolutiva ao candidato** (eliminatório expõe critério). Comparativo lado-a-lado movido para V2. | Status só vira `concluida` após `decisao_revisor` ∈ {aprovado, reprovado}. RNF-07a preservado: nunca auto-rejeição. | Must | — |
| RF-17b | **Sem detector ChatGPT** em V1. Follow-up ao vivo na Etapa 4 (entrevista online) cobre fabricação detectável. **Hash sha256 anti-plágio intercandidato V1** (flag sem bloqueio); similaridade aproximada V2 se necessário. | Decisão consciente alinhada com filosofia BS de não bloquear candidato por heurística unreliable. | Must | — |
| RF-18 | Autosave do progresso a cada 30s + bloqueio de back após avançar etapa | LocalStorage como buffer; sync com server em background | Must | US-06 |
| RF-19 | Sistema não permite candidato fazer testes fora da `etapa_atual='avaliacao_assincrona'` | RLS policy + verificação no Edge Function `submit-resposta` | Must | — |
| RF-19a | Após conclusão do Big Five (POST explícito da UI ao botão "Concluir" via endpoint `submit-bigfive-final`), Edge Function `gerar-devolutiva-bigfive` produz devolutiva **D-lite BFAS-flavored** (formato inspirado no [report BFAS validado do Fernando](../../conhecimento/big-five/report%20big%20five.pdf)): 5 dimensões + percentil cru + banda em 5 níveis (≤15/16-35/36-64/65-84/≥85) + texto interpretativo ~150-200 palavras por dim + analogia "1 em 100 pessoas" + disclaimer emocional + disclaimer LGPD **sem nominalização de CRP** (decisão 2026-06-06: devolutiva não nomeia psicólogo específico — alinhado à linguagem de produto "avaliação comportamental", não "teste psicológico"; o responsável técnico CRP ainda revisa os 25 templates pré go-live, mas não é citado ao candidato). **Geração híbrida:** 25 templates oficiais em [`docs/conhecimento/big-five/templates-devolutiva.md`](../../conhecimento/big-five/templates-devolutiva.md) (curados pelo CRP) + IA Claude personaliza com nome/cargo/percentil exato + output validado Zod. **Nomenclatura:** "Sensibilidade Emocional" para Neuroticismo (PT-BR neutro). **Layout:** 5 páginas (1 por dim) + cabeçalho geral. **Entrega:** in-app imediato + email com link permanente disparado por n8n em ~1min. Persistido em `devolutivas_candidato` com audit completo (`template_version, prompt_version, model_version, raw_response_anthropic, palavras_count`). **Detalhes:** [`PRD-bigfive-revisado.md`](./PRD-bigfive-revisado.md) | Output Zod-validado conforme schema em mini-PRD; consome RAG de `docs/conhecimento/big-five/templates-devolutiva.md` + 5 Word docs PT-BR; persistido em `devolutivas_candidato` para auditoria LGPD | Must | — |
| RF-19b | Devolutiva NUNCA é gerada para Work Sample/SJT nem Redação cultural (eliminatórios — expõem critério) | Apenas mensagem genérica "Etapa concluída. Vamos avaliar." | Must | — |

### 6.4 Etapa 4 — Entrevista Online

| ID | Requisito | Critério de Aceite | Prioridade | US |
|----|-----------|-------------------|------------|------|
| RF-20 | Edge Function `gerar-guia-entrevista` recebe vaga_id + candidatura_id + tipo='online'; retorna 5-7 perguntas STAR/PEI customizadas | Cada pergunta vem com âncoras BARS 1-5 + dimensão testada; output JSON validado por Zod | Must | US-10 |
| RF-20a | Agendamento da entrevista online via **Microsoft Bookings** (nativo M365): sistema embute link Bookings do gestor responsável no email/WhatsApp ao candidato (via n8n) quando candidatura avança para `etapa_atual='entrevista_online'` | RH não precisa marcar manualmente; Bookings já valida slots livres no calendário Outlook do gestor + cria invite com Microsoft Teams auto-gerado | Must | US-10 |
| RF-20b | Webhook do Microsoft Bookings (via Power Automate ou Microsoft Graph subscription) notifica Edge Function `webhook-bookings` quando candidato agenda → grava `agendamentos_entrevista` + atualiza `candidaturas.entrevista_online_em` | Latência ≤ 1min entre booking e DB update; reentrante (idempotente em booking_id) | Must | US-10 |
| RF-20c | Sistema dispara notificação ao gestor 24h antes da entrevista com link do dashboard do candidato | Via n8n cron + email; gestor abre `/rh/candidato/:id/entrevista` com guia + scorecard inline | Must | US-12 |
| RF-21 | Guia gerado considera scorecard das etapas anteriores: prioriza perguntas em dimensões fracas | Quando candidato tem score < 3 em dimensão X, ≥ 1 pergunta do guia explicitamente cobre X | Must | US-10 |
| RF-22 | Tela do gestor `/rh/candidato/:id/entrevista` mostra dashboard candidato + guia da entrevista + scorecard inline editável | Gestor pontua durante entrevista; salva como `entrevistas_candidato.notas_humanas` | Must | US-12 |
| RF-23 | Após entrevista, RH cola transcrição em textarea e clica "Analisar com IA" | Edge Function `avaliar-transcricao-entrevista` retorna scores BARS por competência + flags + citações | Must | US-11 |
| RF-24 | Análise IA da transcrição mostra warning se candidato com score < 3 em alguma dimensão tem flag "linguagem"/"sotaque" — exige revisão humana obrigatória | Sistema bloqueia `avancar_etapa()` até gestor confirmar revisão | Must | — |

### 6.5 Etapa 5 — Entrevista Presencial

| ID | Requisito | Critério de Aceite | Prioridade | US |
|----|-----------|-------------------|------------|------|
| RF-25 | Edge Function `gerar-guia-entrevista` aceita tipo='presencial' e gera guia focado em GAPS detectados na entrevista online | Inputs: vaga + scorecard online + dimensões com score < 4 | Must | US-10 |
| RF-25a | Agendamento da entrevista presencial via **Microsoft Bookings** (mesma feature que online; service de Bookings configurado para presencial = sem auto-criação Teams, com endereço da clínica no invite) | Reuso do mesmo webhook RF-20b; `agendamentos_entrevista.tipo='presencial'` + `endereco` populado | Must | US-10 |
| RF-26 | **Prova de raciocínio lógico** (matriz + letra-número, itens CC0) aplicável **online com proctoring leve** para vagas com `vaga.aplica_cognitivo=true` (default = false; opt-in). Posicionada como prova técnica **não-psicológica** (fora SATEPSI/CFP) | Score gravado em `scores_candidato` tipo='raciocinio_logico'; resultado em **banda qualitativa** (5 faixas), **MARCADO COMO CONTEXTUAL no painel** ("usar como informação adicional, não como filtro"); sem percentil cru/QI. **Detalhes:** [`PRD-cognitivo-raciocinio.md`](./PRD-cognitivo-raciocinio.md) | Must | — |
| RF-27 | Sistema bloqueia rejeição de candidato com base no score de raciocínio isolado (forced override exige justificativa expandida) | Validação no Edge Function `consolidar-decisao-final`: se motivo da rejeição cita o cognitivo sem outras evidências, exige confirmação extra + grava em `bias_audit_log` | Must | — |
| RF-28 | Para dentistas: 1 semana de teste como freela (fora do sistema — política RH) | Documentado na tela do candidato como "próxima etapa: teste prático" | Could | — |

### 6.6 Etapa 6 — Decisão Final

| ID | Requisito | Critério de Aceite | Prioridade | US |
|----|-----------|-------------------|------------|------|
| RF-29 | Edge Function `consolidar-decisao-final` agrega todos scorecards (NÃO re-pontua) + aplica pesos da vaga | Output: dashboard JSON com score consolidado + breakdown por etapa + recomendação textual | Must | US-13 |
| RF-30 | UI consolidada permite ver candidato lado a lado com finalistas (reusa Comparativo da Etapa 2) | Mesma feature de comparativo serve nos 2 momentos | Must | US-13 |
| RF-31 | Decisão final exige justificativa textual obrigatória ≥ 50 caracteres + persiste em `decisao_final` com `por_usuario`, `em`, `decisao` (aprovado/rejeitado/em_espera) | DB constraint NOT NULL + check constraint length | Must | US-14 |
| RF-32 | Endpoint público `/candidato/explicacao/[id]` permite candidato rejeitado solicitar explicação + revisão LGPD Art. 20 | Mostra justificativa + opção "Solicitar revisão"; abre ticket interno se acionado | Must | US-15 |

### 6.7 Configuração de Vaga (transversal)

| ID | Requisito | Critério de Aceite | Prioridade | US |
|----|-----------|-------------------|------------|------|
| RF-33 | Templates de vaga pelos **cargos reais Beauty Smile** (`dentista`, `recepcionista`, `consultor_vendas_premium`, `sdr_social_seller`, `assistente_financeiro`, `asb`, `tsb`, `vaga_generica`) com testes_aplicaveis + pesos default + banco de SJT por cargo. **Detalhes:** [`PRD-sjt-work-sample-odontologia.md`](./PRD-sjt-work-sample-odontologia.md) | RH escolhe template no create vaga; pode override depois. Taxonomia derivada de [`docs/conhecimento/perguntas-vagas.md`](../../conhecimento/perguntas-vagas.md) (formulários reais) | Must | — |
| RF-34 | Pesos `vaga.pesos_avaliacao` jsonb configurável (sliders na UI) com validação soma = 100% | UI mostra erro inline se soma ≠ 100% | Must | — |
| RF-35 | Wizard de marcação de tags em opções de pergunta com bulk-mark "tudo informativa" | Reduz fricção: admin marca só o que importa, default = informativa+peso=0 | Must | — |
| RF-36 | Validação progressiva: tags obrigatórias só validadas no clique "Publicar vaga" | Permite admin criar perguntas em rascunho sem bloquear | Must | — |

### 6.8 Edge Cases & Estados de Erro

| RF | Cenário | Comportamento Esperado |
|----|---------|----------------------|
| RF-05 | Edge Function `analise-candidato-individual` falha (Anthropic API down) | Retry com exponential backoff (3 tentativas); se ainda falhar, grava `analise_candidato_vaga` com `status='falhou'` + `erro` + dispara alerta interno; candidatura ainda aparece no painel mas sem score (RH revisa manualmente) |
| RF-09 | Comparativo solicitado com candidatos de vagas diferentes | Retorna erro 400 "Candidatos devem ser da mesma vaga" |
| RF-13 | SJT submetido sem responder todas perguntas obrigatórias | Block submit + highlight nas não respondidas |
| RF-15 | Candidato fecha tab no meio do Big Five | Autosave preserva progresso; ao voltar, retoma da última pergunta salva |
| RF-23 | Transcrição colada com < 200 caracteres | Erro "Transcrição muito curta para análise. Forneça transcrição completa." |
| RF-31 | Decisão final tentada antes de scorecards das etapas anteriores estarem completos | Block + lista quais scorecards faltam |

---

## 7. Requisitos Não-Funcionais

| ID | Categoria | Requisito | Métrica | Como Testar |
|----|-----------|-----------|---------|------------|
| RNF-01 | Performance | Edge Function `analise-candidato-individual` | P95 ≤ 30s (aceita lentidão IA) | Logging Vercel + alerta se > 30s |
| RNF-02 | Performance | Edge Function `comparativo-candidatos` | P95 ≤ 5s | Idem |
| RNF-03 | Performance | UI render do Painel Candidatos com 100 rows | P95 ≤ 1s | Lighthouse + load test |
| RNF-04 | Segurança | RLS em 100% das tabelas novas | Zero acessos cross-vaga / cross-candidato em testes E2E | Suite Playwright + pgTAP |
| RNF-05 | Segurança | service_role NUNCA no client (mantido de M1) | Zero ocorrências em bundle inspecionado | grep no build output em CI |
| RNF-06 | Segurança | Inputs validados Zod em client + server (defense in depth) | 100% das routes Edge com schema validation | Code review obrigatório |
| RNF-07 | Compliance LGPD | Form Etapa 1 sem campos foto/nascimento/CPF/saúde | Schema Zod rejeita esses campos | Teste unitário do schema |
| RNF-07a | Compliance | Decisão de rejeitar candidato é SEMPRE humana (nunca auto-rejeição por trait) | 0 rows em `decisao_final` com `por_usuario IS NULL`; auditoria mensal | SQL audit |
| RNF-07b | Compliance LGPD | Bias audit mensal regra 4/5 (selection rate por raça/gênero/idade ≥ 80% do grupo de maior taxa) | Job manual mensal exporta CSV → AIF360/Fairlearn | Cronograma operacional + dashboard |
| RNF-07c | Compliance LGPD Art. 20 | Endpoint público de explicação + revisão humana funcional | Candidato testa em UAT trimestral | UAT |
| RNF-08 | Disponibilidade | Sistema disponível para RH durante horário comercial (8h-20h) | ≥ 99% uptime nesse horário | Vercel monitoring + alertas |
| RNF-09 | Auditoria | Toda chamada IA logada com prompt_version, model_version, custo_tokens, input_hash, output | 100% das chamadas auditáveis em SQL retroativamente | SQL query nas tabelas de log |
| RNF-10 | Custo | Custo médio de IA por candidato no funil completo | ≤ R$ 0,50 (incluindo análise individual + 1 comparativo + 1 redação + 1 transcrição + 2 guias) | Anthropic billing × candidatos/mês |
| RNF-11 | Acessibilidade | UI RH e Candidato passam WCAG AA | Score axe-core ≥ 90 nas 5 telas principais | axe + revisão manual |
| RNF-12 | Idioma de produto | Linguagem "avaliação comportamental/cognitiva" (NUNCA "teste psicológico") | Grep em todo source + UI por strings proibidas em CI | Lint custom |
| RNF-13 | Tipos | `database.types.ts` regenerado a cada migration via `npm run db:types` (mantido de M1) | `tsc --noEmit` passa sempre | Husky pre-commit hook |

---

## 8. Considerações Técnicas

### 8.1 Schema (visão geral — detalhado em mini-PRDs por subsistema)

Migrations sequenciais (numeradas a partir de `20260601000001_*` — placeholder, ajustar pra data real):

```
01_drop_legacy_etapa_processo.sql       — backup tabelas atuais → drop enum legado
02_create_etapa_processo_v2.sql         — novo enum 6 valores
03_create_status_candidatura_v2.sql     — revisão do status (sem mudança grande)
04_create_pergunta_opcao_metadata.sql   — tags/peso/nota_ia por opção
05_create_vaga_testes_aplicaveis.sql    — config por vaga
06_create_vaga_etapas_presenciais.sql
07_create_analise_candidato_vaga.sql    — output IA da Etapa 2
08_create_comparativo_solicitado.sql    — audit Etapa 2
09_create_scores_candidato.sql          — 1 row por teste/candidato
10_create_redacoes_candidato.sql        — texto + análise IA
11_create_entrevistas_candidato.sql     — transcrição + análise IA + notas humanas
12_create_decisao_final.sql             — Etapa 6 com NOT NULL constraints
13_create_historico_candidatura.sql     — audit trail completa
14_create_bias_audit_log.sql            — snapshots mensais regra 4/5
15_create_avancar_etapa_trigger.sql     — PL/pgSQL trigger para auto-advance
16_apply_rls_policies_m2.sql            — todas RLS de uma vez
```

**Atenção workaround conhecido (CLAUDE.md):** Migrations PL/pgSQL com `CREATE FUNCTION` ou `DO $$ ... $$` falham via `supabase db push --linked` por SQLSTATE 42601. Workaround: SQL Editor manual + `migration repair`. Esperar isso recorrer em 04, 07, 14, 15.

### 8.2 Tabelas-chave

#### `pergunta_opcao_metadata`
| Campo | Tipo | Constraint | Descrição |
|-------|------|-----------|-----------|
| id | uuid | PK, default gen_random_uuid() | |
| pergunta_id | uuid | FK perguntas(id), NOT NULL | |
| opcao_texto | text | NOT NULL | |
| tag | enum_tag_opcao | NOT NULL | knockout/atencao/neutro/pontua/fortemente_pontua |
| peso | int | NOT NULL, default 0 | -999 a 100 |
| nota_ia | text | NULL | texto pra IA usar como contexto |
| ordem | int | NOT NULL | exibição |

#### `analise_candidato_vaga`
| Campo | Tipo | Constraint | Descrição |
|-------|------|-----------|-----------|
| id | uuid | PK | |
| candidatura_id | uuid | FK candidaturas(id), UNIQUE, NOT NULL | 1:1 |
| score_match | numeric(5,2) | CHECK 0-100 | estável (não muda com comparativo) |
| resumo_cv | text | NOT NULL | |
| resumo_respostas | jsonb | NOT NULL | |
| pontos_fortes | text[] | | |
| gaps | text[] | | |
| flags | text[] | | |
| status | text | NOT NULL, default 'gerado' | gerado/falhou/em_revisao |
| model_version | text | NOT NULL | ex: 'claude-sonnet-4-6' |
| prompt_version | text | NOT NULL | ex: 'analise-individual-v1.2' |
| custo_tokens_input | int | | |
| custo_tokens_output | int | | |
| generated_at | timestamptz | NOT NULL, default now() | |

#### `comparativo_solicitado`
| Campo | Tipo | Constraint | Descrição |
|-------|------|-----------|-----------|
| id | uuid | PK | |
| vaga_id | uuid | FK vagas(id), NOT NULL | |
| solicitado_por | uuid | FK auth.users(id), NOT NULL | |
| candidatura_ids | uuid[] | NOT NULL, CHECK length 2-10 | |
| ranking | jsonb | NOT NULL | [{candidatura_id, posicao, justificativa}] |
| resumo_geral | text | | |
| model_version | text | NOT NULL | |
| prompt_version | text | NOT NULL | |
| custo_tokens_input | int | | |
| custo_tokens_output | int | | |
| created_at | timestamptz | NOT NULL, default now() | |

#### `decisao_final`
| Campo | Tipo | Constraint | Descrição |
|-------|------|-----------|-----------|
| id | uuid | PK | |
| candidatura_id | uuid | FK, UNIQUE, NOT NULL | 1:1 |
| decisao | enum | NOT NULL | aprovado/rejeitado/em_espera |
| justificativa | text | NOT NULL, CHECK length >= 50 | LGPD |
| por_usuario | uuid | FK auth.users(id), NOT NULL | nunca null |
| em | timestamptz | NOT NULL, default now() | |
| explicacao_solicitada_em | timestamptz | NULL | LGPD Art. 20 trigger |
| revisao_solicitada_em | timestamptz | NULL | |
| revisao_resultado | text | NULL | |

#### `agendamentos_entrevista` (NOVO v0.2)
| Campo | Tipo | Constraint | Descrição |
|-------|------|-----------|-----------|
| id | uuid | PK | |
| candidatura_id | uuid | FK candidaturas(id), NOT NULL | |
| tipo | enum | NOT NULL | `online` \| `presencial` |
| ms_bookings_appointment_id | text | UNIQUE NOT NULL | ID retornado pelo Microsoft Bookings via webhook |
| ms_bookings_service_id | text | NOT NULL | ID do service Bookings do gestor (1 service por gestor por tipo) |
| agendado_em | timestamptz | NOT NULL | data/hora marcada |
| duracao_min | int | NOT NULL, default 60 | |
| link_teams | text | NULL | preenchido só pra `tipo='online'` |
| endereco | text | NULL | preenchido só pra `tipo='presencial'` |
| status | enum | NOT NULL, default 'agendado' | `agendado` \| `confirmado` \| `cancelado` \| `concluido` \| `no_show` |
| gestor_user_id | uuid | FK auth.users(id), NOT NULL | quem vai conduzir |
| webhook_payload | jsonb | NOT NULL | payload bruto do MS Bookings (auditoria) |
| cancelado_motivo | text | NULL | |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

#### `bigfive_respostas_em_progresso` (NOVO v0.3)

Tabela auxiliar separada de `scores_candidato`. Recebe autosave incremental (1 row por candidatura, atualizada a cada resposta). `scores_candidato` só recebe row final via `submit-bigfive-final` (post-anti-tampering re-scoring server-side).

| Campo | Tipo | Constraint | Descrição |
|-------|------|-----------|-----------|
| id | uuid | PK | |
| candidatura_id | uuid | FK candidaturas(id), UNIQUE NOT NULL | 1:1 |
| respostas | jsonb | NOT NULL, default '{}' | `{item_id (1-120): score (1-5)}` |
| iniciado_em | timestamptz | NOT NULL, default now() | timestamp da 1ª resposta |
| ultima_atividade_em | timestamptz | NOT NULL, default now() | touch a cada autosave |
| completou_em | timestamptz | NULL | timestamp do submit final (NULL enquanto em progresso) |
| user_agent | text | NULL | metadata mobile/desktop |
| created_at | timestamptz | NOT NULL, default now() | |
| updated_at | timestamptz | NOT NULL, default now() | |

**Index:** `idx_bigfive_progresso_candidatura` em `candidatura_id`. **RLS:** candidato R/W só própria; CRP/RH R todas; cron de TTL deleta após anonimização.

#### `scores_candidato.metadata` jsonb (REFINADO v0.3 pra Big Five)

Para `tipo='big_five'`, `metadata jsonb NOT NULL default '{}'` deve ter shape:

```json
{
  "instrumento": "ipip_neo_120",   // ou "bfi_2" no Plan B
  "versao_item_bank": "v1",
  "lingua": "pt-br",
  "raw_responses": {"1": 4, "2": 3, "...": "...", "120": 5},
  "domain_scores": {"O": {"raw", "t_score", "percentile", "level"}, "C": {...}, "E": {...}, "A": {...}, "N": {...}},
  "facet_scores": [{"facet_id", "name", "domain", "raw", "t_score", "percentile", "level"}, ...x30],
  "norm_group_used": "johnson_2014_intl_neutral_age_21_40",
  "completion_time_seconds": 1380,
  "iniciado_em": "2026-04-28T14:30:00Z",
  "completou_em": "2026-04-28T14:53:00Z",
  "flags": []
}
```

Validação Zod em `supabase/functions/_shared/schemas/bigfive-scores.ts`. Banda level enum: `'muito_baixo' | 'moderadamente_baixo' | 'medio' | 'moderadamente_alto' | 'muito_alto'`.

#### `scores_candidato.metadata` jsonb — `tipo='raciocinio_logico'` (NOVO v0.7, cognitivo)

Mesmo pattern agnóstico. Shape: `{instrumento: 'raciocinio_logico_cc0', versao_item_bank, fontes_itens[], raw_responses, shuffle_seed, secoes: {matriz:{raw,n_itens}, letra_numero:{raw,n_itens}}, score_total_raw, banda, norm_ref, completion_time_seconds, flags[]}`. Validação Zod em `supabase/functions/_shared/schemas/cognitivo-scores.ts`. Banda enum (5 faixas): `'bem_abaixo' | 'abaixo' | 'na_media' | 'acima' | 'bem_acima'`. Tabela auxiliar `cognitivo_respostas_em_progresso` (autosave) espelha `bigfive_respostas_em_progresso`. Scoring server-side (CTT soma simples) via EF `submit-cognitivo-final` (anti-tampering). **Detalhes:** [`PRD-cognitivo-raciocinio.md`](./PRD-cognitivo-raciocinio.md) §8.

#### `devolutivas_candidato` (NOVO v0.2)
| Campo | Tipo | Constraint | Descrição |
|-------|------|-----------|-----------|
| id | uuid | PK | |
| candidatura_id | uuid | FK candidaturas(id), NOT NULL | |
| tipo | enum | NOT NULL | `bigfive` (V1); `disc` futuro opcional |
| conteudo_jsonb | jsonb | NOT NULL | `{dimensoes: [{nome, nivel, texto_interpretativo}], destaques: {...}}` |
| enviado_em | timestamptz | NULL | quando email/in-app foi disparado |
| acessado_em | timestamptz | NULL | quando candidato abriu (telemetria) |
| model_version | text | NOT NULL | |
| prompt_version | text | NOT NULL | |
| custo_tokens_input | int | | |
| custo_tokens_output | int | | |
| generated_at | timestamptz | NOT NULL, default now() | |

(demais tabelas detalhadas em mini-PRDs derivados — ver §15)

### 8.3 RLS Policies (template)

```sql
-- candidato vê só própria candidatura
CREATE POLICY "candidato_le_propria_candidatura" ON candidaturas
  FOR SELECT USING (candidato_id IN (SELECT id FROM candidatos WHERE auth_user_id = auth.uid()));

-- RH lê todas as candidaturas (roles: rh, admin)
CREATE POLICY "rh_le_candidaturas" ON candidaturas
  FOR SELECT USING (
    (auth.jwt() -> 'app_metadata' ->> 'role')::text IN ('rh', 'admin')
  );

-- analise_candidato_vaga: candidato lê própria, RH lê todas
CREATE POLICY "candidato_le_propria_analise" ON analise_candidato_vaga
  FOR SELECT USING (
    candidatura_id IN (
      SELECT id FROM candidaturas
      WHERE candidato_id IN (SELECT id FROM candidatos WHERE auth_user_id = auth.uid())
    )
  );

-- INSERT em decisao_final só via Edge Function (service_role) — bloquear client direto
CREATE POLICY "decisao_final_no_client_insert" ON decisao_final
  FOR INSERT WITH CHECK (false); -- nenhum INSERT do client

-- bias_audit_log: só admin
CREATE POLICY "admin_le_bias_audit" ON bias_audit_log
  FOR SELECT USING ((auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin');
```

### 8.4 Edge Functions

| Função | Trigger | Input | Output | Modelo IA | Estimativa custo/call |
|--------|---------|-------|--------|-----------|------------------------|
| `analise-candidato-individual` | DB trigger ON INSERT candidaturas (filtrado para passar knock-outs) | candidatura_id | grava em analise_candidato_vaga | claude-sonnet-4-6 | ~R$ 0,05 |
| `comparativo-candidatos` | HTTP POST do client RH | {vaga_id, candidatura_ids[]} | {ranking, justificativa, resumo_geral} | claude-sonnet-4-6 | ~R$ 0,15 |
| `gerar-guia-entrevista` | HTTP POST do client RH | {vaga_id, candidatura_id, tipo: 'online'\|'presencial'} | {perguntas: [{texto, dimensao, ancoras_bars}]} | claude-sonnet-4-6 | ~R$ 0,03 |
| `avaliar-redacao` | HTTP POST do candidato (após submit redação) | {redacao_id, texto, rubric_id} | {scores_por_dimensao, citacoes, score_geral} | claude-sonnet-4-6 | ~R$ 0,02 |
| `avaliar-transcricao-entrevista` | HTTP POST do client RH | {entrevista_id, transcricao, rubric_id} | {scores_por_competencia, citacoes, flags} | claude-sonnet-4-6 | ~R$ 0,08 |
| `consolidar-decisao-final` | HTTP POST do client RH | {candidatura_id} | {dashboard_json, score_consolidado, breakdown} | claude-sonnet-4-6 | ~R$ 0,03 |
| `lgpd-explicacao-candidato` | HTTP POST do client candidato | {candidatura_id} | {motivo_textual, por_usuario, score_match, opcao_revisao} | sem IA — query DB | ~R$ 0 |
| `submit-bigfive-final` (NOVO v0.3) | HTTP POST do client candidato ao botão "Concluir" | `{candidatura_id, raw_responses: {item_id: 1-5}[120]}` | server-side scoring (TS port inline, anti-tampering) → grava `scores_candidato` + chama `gerar-devolutiva-bigfive` síncrona → retorna `{devolutiva, score_id, devolutiva_id}` | sem IA própria (chama EF devolutiva internamente) | ~R$ 0 (custo agregado em `gerar-devolutiva-bigfive`) |
| `gerar-devolutiva-bigfive` (REFINADA v0.3) | Chamada interna por `submit-bigfive-final` (não mais DB trigger — explicitada chamada inline pra latência ≤ 5s síncrono) | `{score_id}` | gera devolutiva D-lite (5 dim + percentil + 5 bandas + texto ~150-200 palavras/dim) via híbrido templates+IA; persiste em `devolutivas_candidato` com audit completo; dispara n8n flow `bigfive-email-devolutiva` em ~1min | claude-sonnet-4-6 + RAG `docs/conhecimento/big-five/templates-devolutiva.md` (25 templates oficiais) + Word docs PT-BR | ~R$ 0,02-0,03 |
| `webhook-bookings` (NOVO v0.2) | HTTP POST de Power Automate / MS Graph subscription | payload Bookings | INSERT/UPDATE `agendamentos_entrevista` + UPDATE `candidaturas.entrevista_*_em` | sem IA — handler de webhook | ~R$ 0 |
| `cost-alerter` (NOVO v0.5) | Postgres LISTEN no canal `cost_anomaly` (emit por trigger PL/pgSQL após INSERT em `ai_cost_daily`) + cron horário | { call_type, threshold_violated, vaga_id?, candidato_id?, value, threshold } | email DPO + RH lead via Supabase SMTP/Resend; INSERT `recruiter_alerts` row | sem IA | ~R$ 0 |

**Custo total médio por candidato** que vai até decisão final: ~R$ 0,38 (dentro do RNF-10 R$ 0,50). Mix Haiku 4.5 (cv_summary) + Sonnet 4.6 (6 demais) com Anthropic ephemeral cache 5min reduz ~30% em vagas de alta cadência (mini-PRD AI Prompt Library §8.4 detalha matriz de modelos).

### 8.5 Estrutura de arquivos

```
src/
├── features/
│   ├── triagem-rh/
│   │   ├── components/
│   │   │   ├── PainelCandidatosVaga.tsx
│   │   │   ├── ComparativoTable.tsx
│   │   │   └── CandidatoCard.tsx
│   │   ├── hooks/
│   │   │   ├── useAnaliseCandidato.ts
│   │   │   └── useComparativo.ts
│   │   ├── services/
│   │   │   └── triagemService.ts
│   │   ├── schemas/
│   │   └── types/
│   ├── avaliacao-assincrona/
│   │   ├── components/
│   │   │   ├── BlocoAvaliacao.tsx
│   │   │   ├── SJTMultiplaEscolha.tsx
│   │   │   ├── BigFiveQuestionario.tsx
│   │   │   └── RedacaoEditor.tsx
│   │   └── ...
│   ├── entrevista/
│   │   ├── components/
│   │   │   ├── GuiaEntrevista.tsx
│   │   │   ├── TranscricaoInput.tsx
│   │   │   └── ScorecardInline.tsx
│   │   └── ...
│   ├── decisao-final/
│   │   └── components/
│   │       ├── DashboardConsolidado.tsx
│   │       └── DecisaoForm.tsx
│   └── config-vaga/
│       └── components/
│           ├── TemplateVagaSelector.tsx
│           ├── PesosSliders.tsx
│           ├── PerguntaWithTagsForm.tsx
│           └── BulkMarkDialog.tsx

supabase/
├── functions/
│   ├── _shared/
│   │   ├── prompts/
│   │   │   ├── analise-individual.ts
│   │   │   ├── comparativo.ts
│   │   │   ├── gerar-guia.ts
│   │   │   ├── avaliar-redacao.ts
│   │   │   ├── avaliar-transcricao.ts
│   │   │   └── consolidar-decisao.ts
│   │   ├── ai-client.ts          (wrapper Anthropic com retry + logging)
│   │   ├── bars-rubrics.ts       (rubrics pré-definidos por tipo de avaliação)
│   │   └── audit-logger.ts       (logging estruturado LGPD-compliant)
│   ├── analise-candidato-individual/
│   ├── comparativo-candidatos/
│   ├── gerar-guia-entrevista/
│   ├── avaliar-redacao/
│   ├── avaliar-transcricao-entrevista/
│   ├── consolidar-decisao-final/
│   └── lgpd-explicacao-candidato/
└── migrations/
    └── 20260601000001_*.sql (16 migrations sequenciais)
```

### 8.6 Diagrama de Arquitetura

```
                    ┌─────────────────────┐
                    │   Candidato (SPA)   │
                    └──────────┬──────────┘
                               │
                ┌──────────────┴──────────────┐
                │                             │
     ┌──────────▼──────────┐       ┌─────────▼──────────┐
     │  Supabase Postgres  │       │  Edge Function     │
     │  (RLS habilitada)   │◀─────▶│  submit-resposta   │
     └──────────┬──────────┘       └────────────────────┘
                │
                │ trigger ON INSERT candidaturas
                ▼
     ┌────────────────────────────────────┐
     │  Edge Function                      │
     │  analise-candidato-individual       │──▶ Anthropic Claude API
     │  (cache prompt: vaga + rubric)      │
     └─────────────┬──────────────────────┘
                   │ INSERT analise_candidato_vaga
                   ▼
     ┌────────────────────┐
     │  Painel RH (SPA)   │ ──── HTTP POST ───▶ ┌──────────────────────┐
     └─────────┬──────────┘                     │ Edge Function        │
               │                                │ comparativo-         │──▶ Claude
               │                                │ candidatos           │
               │                                └──────────────────────┘
               │
               │ ─── POST ──▶ outras Edge Functions
               │              (gerar-guia, avaliar-*, consolidar)
               │
               │ ─── DB write ───▶ historico_candidatura (audit trail)
               │
               └─── async event ──▶ ┌──────────┐
                                     │   n8n    │ ──▶ Email/WhatsApp candidato
                                     │ (perif.) │ ──▶ Lembrete SLA RH
                                     └──────────┘
```

### 8.7 Decisões técnicas-chave

| Decisão | Razão | Alternativa rejeitada |
|---------|-------|----------------------|
| Edge Functions Deno + Supabase, n8n só periferia | Auditoria LGPD precisa de versionamento Git; n8n cross-region adiciona latência e ponto de falha | n8n no core (rejeitado: viola constraint do PRD-Master) |
| Claude Sonnet 4.6 default; Haiku para tarefas curtas | Custo-benefício; Sonnet supera GPT-4o em scoring estruturado segundo benchmarks | Fine-tuning custom (rejeitado: prematuro pré-1000 candidatos) |
| Anthropic prompt caching para vaga + rubric | Reduz custo ~30% sem perder qualidade; vaga+rubric é parte estável do contexto | Sem caching (rejeitado por custo) |
| Output JSON via Anthropic tool use + Zod validation | Garante estrutura sem retries; falha rápida em malformados | Free-form text + parsing (rejeitado: fragil) |
| Transcrição colada manualmente, não Whisper integrado | Evita Whisper transcript bias + custo ($0.006/min); usuário decidiu paste manual | Whisper integrado (deferido a v2 se necessidade emergir) |
| Score absoluto (analise_candidato_vaga.score_match) ESTÁVEL, ranking relativo no comparativo | Coerência entre views; score do candidato não pode mudar conforme cohort | Re-scoring no comparativo (rejeitado: confunde RH) |
| **Microsoft Bookings nativo M365** para agendamento (vs Cal.com / Graph API direto) | Beauty Smile já paga M365; sem vendor extra; UI booking pronta; auditoria corporativa M365 já cobre | Cal.com (rejeitado: vendor adicional sem ganho); Graph API direto (rejeitado: precisa construir UI de booking) |
| **RAG via filesystem `docs/conhecimento/`** (vs vector DB) | Volume baixo (~50 docs); markdown versionado em Git; carregamento síncrono ≤ 50ms; sem infra extra | Vector DB Pinecone/pgvector (rejeitado: over-engineering pra volume atual; pode evoluir em V2) |
| **Devolutiva Big Five qualitativa** (não percentil cru) | Big Five é contexto não-eliminatório; percentil exposto convida contestação; banda qualitativa + texto interpretativo entrega valor sem expor à comparação fria | Percentil numérico (rejeitado: risco de "78 mas fui rejeitado"); zero devolutiva (rejeitado: péssimo employer brand) |
| **AI Prompt Library Híbrido git→DB** (v0.5) | Markdown no git é fonte autoritativa (diff + blame + PR review LGPD-compliant); CI script hidrata `prompt_versions` Postgres; Edge Functions consultam DB em runtime para canary % + rollback SQL <60s sem redeploy. Detalhes no mini-PRD `PRD-ai-prompt-library-m2.md`. | FS-only (perde canary + rollback rápido); DB-only (perde diff/blame git); filename suffix `-v1` (duplica info, churn em renames) |
| **Modelo IA otimizado por complexidade** (v0.5) | Haiku 4.5 para CV summary (extração estruturada simples); Sonnet 4.6 para 6 demais usos (julgamento avaliativo); GPT-4o-mini fallback só após circuit breaker abrir (5 falhas em 60s). Reduz custo ~40% mantendo qualidade onde importa. | Sonnet universal (+60% custo); Haiku universal (qualidade insuficiente em ranking/transcript); fallback automático a cada falha (mascara hiccups Anthropic + dobra custo) |
| **Versionamento SemVer + content_hash + schema_version_required** (v0.5) | SemVer comunica intent (MAJOR/MINOR/PATCH); content_hash SHA-256 é tamper-proof; schema_version_required permite deploy assíncrono de Edge Function vs prompt durante migração. Imutabilidade pós-publicação enforcada por trigger PL/pgSQL. Retenção forever-while-referenced (purga só órfãos +1y). | OU SemVer (vulnerável a edit silent); OU hash (não comunica intent); schema embutido em hash (mata MINOR/PATCH semântica); retention fixa (perde reproducibility para aprovados com 5y retention) |

### 8.8 Arquitetura RAG / Knowledge Base (NOVO v0.2)

Edge Functions de IA consomem **conhecimento curado** depositado em `docs/conhecimento/`. Padrão operacional:

```
┌──────────────────────────────────────┐
│   docs/conhecimento/                 │
│   ├── big-five/  (RAG Big Five)      │
│   ├── icar60/    (RAG ICAR60)        │
│   ├── sjt/       (RAG SJT/Work Sample│
│   ├── fit-cultural/ (RAG redação)    │
│   └── prompts/   (templates 8x +     │
│                   shared Zod schemas)│
└─────────────┬────────────────────────┘
              │ load-on-deploy (filesystem read em cold start)
              ▼
┌──────────────────────────────────────┐
│   Edge Function (Deno)               │
│   ├─ carrega prompt versionado       │
│   ├─ carrega contexto científico     │
│   ├─ injeta dados do candidato       │
│   ├─ chama Claude Sonnet (cache on)  │
│   ├─ valida output via Zod schema    │
│   └─ loga audit (LGPD Art. 20)       │
└──────────────────────────────────────┘
```

**Princípios:**
1. **RAG over fine-tuning** — atualizar conhecimento = editar markdown + PR + deploy; sem retreino
2. **Conhecimento separado de prompt** — mesmo prompt pode usar contextos diferentes (ex: Big Five vs DISC reusam template `06-culture-fit-essay`)
3. **Versionamento Híbrido git→DB para prompts** (REFINADO v0.5) — markdown no git é fonte autoritativa (diff + blame + PR); CI script `sync-prompts.ts` calcula content_hash SHA-256 + UPSERT em `prompt_versions` Postgres; Edge Functions consultam DB em runtime para canary % + rollback SQL <60s. SemVer (X.Y.Z) + content_hash + `schema_version_required` no frontmatter. Imutabilidade pós-publicação enforcada por trigger PL/pgSQL. Filename SEM suffix `-vN` — histórico vive em git log + DB rows. Detalhes completos em `PRD-ai-prompt-library-m2.md`.
4. **Auditoria LGPD-by-default** — todo template carrega seções obrigatórias de logging + bias check + privacy notes (ver `docs/conhecimento/prompts/AUDITORIA-LGPD-LOGGING-VERSIONING.md`); cada chamada IA gera 1 row em `ai_call_logs` com `prompt_version_id` + `content_hash` + input pseudonimizado
5. **Performance** — filesystem read em cold start é APENAS para conhecimento auxiliar (Big Five Word docs, ICAR60 etc); prompts são consultados via DB query (índice `idx_prompt_versions_type_active`, p95 <50ms)

**Materiais consumidos hoje (4/4 deep researches done + materiais Fernando):**
- `big-five/` — IPIP-NEO-120 PT-BR JSON (item bank) + 6 PDFs acadêmicos + 5 Word docs interpretativos por dimensão + report BFAS validado (modelo de devolutiva)
- `icar60/` — pesquisa + alternativas BR
- `sjt/` — pesquisa + exemplos públicos plataformas
- `prompts/` — 8 templates prontos (CV summary, CV-job match, comparative ranking, interview guide, transcript analysis, culture-fit essay, work-sample SJT, Edge Function reference) + shared Zod schemas + 5 fontes técnicas + LGPD audit guide

Todos persistidos no Git. Atualização = PR + review.

---

## 9. Riscos & Mitigações

| # | Risco | Prob. | Impacto | Mitigação | Owner |
|---|-------|-------|---------|-----------|-------|
| 1 | ~~**Pesquisa #1 (ICAR60 PT-BR) não encontra versão validada**~~ **RESOLVIDO** | — | — | Pesquisa confirmou ICAR60 inviável (4 bloqueios). **Pivot lockado:** prova técnica de raciocínio CC0 não-psicológica, online, contextual — `PRD-cognitivo-raciocinio.md`. Risco residual migrou para adverse impact (ver risco 5) | Fernando |
| 2 | **Pesquisa #2 (Big Five PT-BR) não encontra versão open-source** | Média | Médio | Plan B: BFP-2 proprietário (custo) ou BFI-2 (60 itens, validado por Damásio) | Fernando |
| 3 | **Custo de IA explode acima de R$ 0,50/candidato** | Média | Alto | Otimização: prompt caching, fallback para Haiku em tarefas curtas, monitoring + alerta se > R$ 1,00 | Tech Lead |
| 4 | **Migration PL/pgSQL falha (workaround conhecido)** | Alta | Médio | Documentado no CLAUDE.md; reservar tempo extra na Phase 0 do M2 para SQL Editor manual + migration repair | Tech Lead |
| 5 | **Bias audit revela violação regra 4/5** | Média | Alto | Mitigação imediata: marcar requisito violador como `quarentena=true`; revisar prompts/critérios; re-treinar calibração se Vervoe-style | Fernando + Compliance |
| 6 | **Candidato processa Beauty Smile por LGPD Art. 20** | Baixa | Alto | Endpoint `lgpd-explicacao-candidato` + workflow de revisão humana operacional desde MVP; documentação clara de processo interno | Jurídico + Tech |
| 7 | **RH não adota o sistema (volta para planilha)** | Média | Alto | UAT com Sara em cada Phase; UI RH co-desenhada; rollout gradual (1 vaga piloto → 5 → todas) | Product |
| 8 | **Transcrição IA pontua mal candidatos com sotaque/não-nativos** | Alta | Médio | Flag obrigatória de revisão humana se score < 3 + flag linguagem; bias audit dimensão "região do candidato" | Tech + Compliance |
| 9 | **Volume de candidaturas explode (>200/vaga) e Edge Function sobrecarrega** | Baixa | Médio | Rate limit por vaga; queue assíncrona se > 50 simultâneos; prompt cache reduz custo | Tech Lead |
| 10 | **Candidato abandona Etapa 3 (60min é demais)** | Média | Alto | Telemetria de drop-off por etapa; medir % conclusão em UAT; se < 50% considerar dividir bloco | Product |
| 11 | **Gestor de clínica não usa o guia de entrevista (volta para improviso)** | Alta | Médio | Tiny act of discovery: validar guia com 3 gestores antes de construir UI; treinamento obrigatório | Product |
| 12 | **Migration deprecando enum legado quebra dados existentes** | Baixa | Crítico | Backup + migration step-by-step + plan de rollback em SQL; teste em staging antes de prod | Tech Lead |

### 9.1 Pre-mortem

> **"É 6 meses depois do lançamento. O M2 fracassou. Por quê?"**

1. **Sara voltou pra planilha em 30 dias.** UI do painel candidatos ficou complexa demais; carregamento lento no comparativo; ela não confiou no score IA porque viu 1 candidato bem ranqueado que era óbvio "ruim". Lição: tiny act of discovery com vagas históricas ANTES de construir UI; rodar UAT semanal com Sara.

2. **Beauty Smile foi processada por LGPD com decisão de R$ 5M.** Candidato rejeitado pediu explicação Art. 20, sistema mostrou "knockout: experiência insuficiente" mas o critério na vaga era ambíguo + similar candidato com perfil idêntico foi aprovado. Lição: knock-outs precisam ser objetivos de verdade; auditoria de paridade entre rejeitados e aprovados deve rodar mensal.

3. **Custo de IA estourou orçamento.** Anthropic cobrou R$ 8.000/mês (vs orçado R$ 1.500). Causa: comparativo sendo chamado pra cada vaga 5x/dia + 200 candidatos/vaga + sem cache. Lição: cache + rate limit + alerta > R$ 100/dia desde o dia 1.

4. **Gestores não usaram guia de entrevista.** Achavam que "engessava" a conversa. Voltaram a entrevistar de improviso. Resultado: scorecards inúteis. Lição: validar guia com 3 gestores reais antes de construir UI; treinamento obrigatório no rollout.

5. **Bias audit revelou que sistema rejeita candidatos pretos em 2× a taxa.** Causa: embeddings do LLM penalizam nomes não-anglo; redação cultural pontua menor para candidatos com escrita não-formal. Lição: bias audit DESDE O MVP (não v2); validação cruzada manual de 50 candidatos rejeitados vs aprovados por demografia; possível migrar embeddings para alternativa menos viesada.

---

## 10. Questões em Aberto

| # | Questão | Responsável | Prazo | Status |
|---|---------|-------------|-------|--------|
| 1 | ~~ICAR60 tem versão validada PT-BR com item bank acessível?~~ | Fernando | 2026-04-27 | **Fechada (NÃO)** — Deep Research #1 confirmou ICAR60 inviável (licença non-commercial + zero validação PT-BR + fora SATEPSI + sem normas BR). **Pivot 2026-06-05:** prova técnica de raciocínio CC0 não-psicológica, online, contextual. Ver `PRD-cognitivo-raciocinio.md` |
| 2 | ~~Big Five (IPIP-NEO-120) tem versão PT-BR open-source com scoring algorithm + normas brasileiras?~~ | Fernando | 2026-04-27 | **Fechada** — IPIP-NEO-120 PT-BR confirmado, item bank JSON em `docs/conhecimento/big-five/fontes/`. Plan B: BFI-2 PT-BR (Pires 2023) |
| 3 | ~~Quais SJT/Work Sample existentes podem servir de modelo para os 4 cargos (dentista/higienista/recepção/coord)?~~ | Fernando | 2026-04-27 | **Fechada** — ver `docs/conhecimento/sjt/PESQUISA-sjt-odontologia-beauty-smile.md` |
| 4 | ~~Quais prompts exatos (com BARS) para cada um dos 7 usos de IA? Custo estimado por uso?~~ | Fernando | 2026-04-27 | **Fechada** — 8 templates prontos em `docs/conhecimento/prompts/templates/` |
| 5 | ~~Big Five precisa de psicólogo aplicador ou pode ser auto-aplicado pelo candidato online? (CFP/SATEPSI)~~ | Fernando + Jurídico | 2026-04-28 | **Fechada** — Big Five auto-aplicado online pelo candidato é defensável legalmente sob 3 condições (todas adotadas): (a) reposicionamento como "self-assessment de estilo de trabalho" / "questionário de perfil comportamental" (NUNCA "teste psicológico" — RNF-12); (b) **psicólogo CRP ativo como responsável técnico** já contratado pela empresa em regime de consultoria, nominalizado em toda devolutiva e em explicações LGPD Art. 20; (c) score Big Five é **NUNCA fator único de eliminação** (auditoria SQL mensal). Detalhes operacionais em [`PRD-bigfive-revisado.md` §9](./PRD-bigfive-revisado.md). Pendente: nominalizar nome+CRP do responsável técnico no `disclaimer_lgpd_crp` (Q1 do mini-PRD). |
| 6 | Política de retenção de dados de candidatos rejeitados (LGPD): quanto tempo guardar antes de purge? | Jurídico | Pré M2 | Aberta |
| 7 | Quem é o auditor LGPD designado para revisar bias_audit_log mensal? | RH/Jurídico | Pré M2 | Aberta |
| 8 | Templates de pesos default por cargo (dentista/recepção/coord) — quem valida que faz sentido na prática? | Sara (RH) + Fernando | UAT Phase 1 | Aberta |
| 9 | Como integrar com sistema de pagamento de freela do dentista (1 semana de teste)? | Fernando | v2 | Diferida |
| 10 | Carta de devolução personalizada por IA para LGPD-compliance — design da mensagem | RH + Jurídico | v2 | Diferida |
| 11 | Workflow exato do n8n para notificações (qual cadência? qual canal padrão?) | RH | Phase 0 do M2 | Aberta |

---

## 11. Timeline & Fases

Estimativa preliminar — refinada após `/gsd-discuss-phase` quando M2 abrir.

| Phase | Escopo | Duração | Milestone |
|-------|--------|---------|-----------|
| **Phase 0 — Fundação M2** | Migrations 01-16 + RLS + tipos regenerados + 1 Edge Function "hello" para validar pipeline IA + n8n setup periférico | 1-2 sem | DB pronto, pipeline IA validado em 1 chamada, primeira automação n8n no ar |
| **Phase 1 — Triagem com IA** | Edge Function `analise-candidato-individual` + Painel RH + Comparativo + audit logs | 2-3 sem | Sara consegue triar 1 vaga real ponta-a-ponta |
| **Phase 2 — Avaliação Assíncrona** | UI bloco único + integração SJT/BigFive/Redação **+ Prova de raciocínio (online, opt-in) + EF `submit-cognitivo-final`** + Edge Function `avaliar-redacao` + autosave | 2-3 sem | Candidato real conclui Etapa 3 com scorecard útil |
| **Phase 3 — Entrevista Online** | Edge Function `gerar-guia-entrevista` + Tela gestor + Edge Function `avaliar-transcricao-entrevista` | 1-2 sem | Gestor real usa guia em entrevista real |
| **Phase 4 — Entrevista Presencial + Decisão Final** | UI presencial + Edge Function `consolidar-decisao-final` (com regra RF-27 do cognitivo) + UI decisão + endpoint LGPD | 2 sem | 1 candidato vai do início ao `aprovado` |
| **Phase 5 — Hardening + Bias Audit + Rollout** | Bias audit operacional + UAT em 3 vagas reais + ajustes + treinamento RH + go-live | 1-2 sem | Sistema em produção com 1 vaga piloto |

**Total estimado**: 9-14 semanas (~2-3 meses)

---

## 12. Análise Competitiva

| Solução | Pontos Fortes | Pontos Fracos | Diferencial Beauty Smile |
|---------|---------------|---------------|--------------------------|
| **TestGorilla** | 350+ testes prontos, fácil setup, brand reconhecida | Pricing opaco, minimum recharge alto, SJT genéricos não-clínicos | Customizado para odontologia, sem licença anual, BARS transparente |
| **Vervoe** | "Employer Calibration" inteligente, work simulations role-specific | Caro para volume baixo, vendor lock-in, pouco PT-BR | Calibração local + LGPD-ready desde dia 1 + linguagem PT-BR nativa |
| **HireVue** | Suite enterprise robusta, integrações | Análise facial gerou processos EEOC; setup fee $15-40k inacessível | Sem facial/voice analysis, custo = R$ 0,50/candidato, decisão sempre humana |
| **Canditech** | AI Builder gera testes do JD, custom scoring agents | Sem detalhes técnicos públicos (vaporware risk), sem PT-BR validado | Prompts versionados em Git, auditoria total |
| **Mettl (TCS iON)** | Proctoring 3-camadas, banco grande de testes | UX hostil ao candidato, falsos positivos no proctoring, sem foco saúde | Foco específico clínica odontológica, candidato experience > suspeita |
| **Planilha Google + WhatsApp (status quo)** | Zero setup, RH conhece | Zero rastreabilidade, zero auditoria LGPD, scores subjetivos sem critério | Substitui isso direto |

---

## 13. Estratégia de Rollout

- [ ] **Feature flag**: `m2_funil_rh_enabled` (toggle global) + por vaga (`vaga.usa_funil_v2 = true`)
- [ ] **Rollout gradual**:
  - Sem 1: 1 vaga piloto (Sara + 1 gestor) — máx 20 candidaturas
  - Sem 2-3: 5 vagas + treinamento gestores
  - Sem 4+: todas vagas novas; vagas legacy permanecem em fluxo antigo até fechar
- [ ] **Rollback plan**: feature flag desliga UI nova; Edge Functions ficam idle; dados continuam gravando (não corrompe); Sara volta para planilha temporariamente
- [ ] **Comunicação interna**: training session 2h com Sara + gestores antes do go-live; doc interno em Notion; canal Slack #recrutamento-suporte
- [ ] **Comunicação candidatos**: email opcional "Beauty Smile melhorou seu processo seletivo" — ajuda set expectations sobre Etapa 3 mais robusta

---

## 14. Plano de Documentação

- [ ] **Guia do RH** — manual operacional `docs/operacional/manual-rh-funil-m2.md` (como triar, comparar, decidir, lidar com Art. 20)
- [ ] **Guia do Gestor de Clínica** — `docs/operacional/manual-gestor-entrevista.md` (como usar guia + scorecard + decisão consensual)
- [ ] **Documentação técnica** — schemas, Edge Functions, prompts versionados em `docs/tecnico/m2-architecture.md`
- [ ] **Changelog** — migrations + features versionadas em `CHANGELOG.md`
- [ ] **Política LGPD interna** — `docs/lgpd/politica-recrutamento-m2.md` (retenção, consentimento, Art. 20)
- [ ] **Mini-PRDs derivados** (ver §15)

---

## 15. Estratégia "Master + Mini-PRDs" — Resposta à pergunta sobre enriquecimento pós-pesquisa

**Recomendação:** ambos os caminhos, em sequência. Este Master cobre arquitetura, integração, UI, LGPD e fluxos. Após retornarem os 4 deep researches, **enriquecemos este Master + criamos mini-PRDs específicos** para cada componente avaliativo. Esse é o pattern já usado pelo projeto (ver `docs/prds/bigfive-prd.md`, `disc-prd.md`, `cognitivo-icar-prd.md`, `fit-cultural-prd.md`).

### Updates já aplicados em v0.2 ✅
- §6 RF-15: instrumento confirmado (IPIP-NEO-120 PT-BR + item bank JSON em `docs/conhecimento/big-five/fontes/`)
- §6 RF-19a/b NOVOS: devolutiva Big Five qualitativa + textual
- §6 RF-20a/b/c + RF-25a NOVOS: agendamento Microsoft Bookings
- §8.2: novas tabelas `agendamentos_entrevista` + `devolutivas_candidato`
- §8.4 Edge Functions: 2 novas (`gerar-devolutiva-bigfive`, `webhook-bookings`)
- §8.7: 3 novas decisões técnicas (Bookings, RAG filesystem, devolutiva qualitativa)
- §8.8 NOVA: arquitetura RAG / Knowledge Base
- §10: questões 1, 2, 3, 4 fechadas

### Updates planejados pós síntese dos materiais Fernando (rumo a v1.0) — ✅ TODOS CONCLUÍDOS
- ~~Refinar §6 RF-19a com formato exato da devolutiva (após ler 5 Word docs + report BFAS)~~ ✅ **Done v0.3** — formato D-lite (5 dim + percentil cru + 5 bandas + ~150-200 palavras/dim) + 25 templates oficiais
- ~~Adicionar exemplos de templates de devolutiva por dimensão em mini-PRD `PRD-bigfive-revisado.md`~~ ✅ **Done v0.3** — `docs/conhecimento/big-five/templates-devolutiva.md` (25 templates curados)
- ~~§6 RF-26 (ICAR60): refinar com instrumento exato pós leitura da pesquisa #1~~ ✅ **Done v0.7** — pivot p/ prova de raciocínio CC0 não-psicológica online (`PRD-cognitivo-raciocinio.md`)

### Mini-PRDs derivados a criar pós-pesquisa

| Mini-PRD | Substitui / Atualiza | Conteúdo principal |
|----------|----------------------|--------------------|
| **[`PRD-cognitivo-raciocinio.md`](./PRD-cognitivo-raciocinio.md)** ✅ **Done 2026-06-05** (substitui o planejado `PRD-icar60-cognitivo.md`) | Aposenta `raven-onboarding-prd.md` + `cognitivo-icar-prd.md` (superseded) | **Pivot ICAR60 → prova técnica de raciocínio CC0 não-psicológica.** Itens matriz + letra-número (Harvard Dataverse CC0), **online com proctoring leve**, scoring CTT server-side (`submit-cognitivo-final`), banda qualitativa 5 faixas (sem percentil/QI), `scores_candidato` tipo `raciocinio_logico` + `cognitivo_respostas_em_progresso`, RF-27 mantido, bias audit 4/5. Reusa shell `TesteRavenPage.tsx`. 4 artefatos em `docs/conhecimento/icar60/` |
| **[`PRD-bigfive-revisado.md`](./PRD-bigfive-revisado.md)** ✅ **Done 2026-04-28** | Substitui `../bigfive-prd.md` (DEPRECATED) | IPIP-NEO-120 PT-BR + devolutiva D-lite (5 dim + percentil cru + 5 bandas + ~150-200 palavras/dim) + scoring TS port + 25 templates curados em `docs/conhecimento/big-five/templates-devolutiva.md` + nomenclatura "Sensibilidade Emocional" + TTL 12 meses + Plan B BFI-2 |
| **[`PRD-sjt-work-sample-odontologia.md`](./PRD-sjt-work-sample-odontologia.md)** ✅ **Done 2026-06-05** | NOVO | **Taxonomia de cargos reescrita a partir dos formulários reais** ([`perguntas-vagas.md`](../../conhecimento/perguntas-vagas.md)): 7 bancos — Dentista (3 MC CFO + case Mariana), Recepcionista (5 MC), Consultor de Vendas Premium (3 MC + case Renata), SDR/Social Seller (3 MC + work-sample WhatsApp), Assistente Financeiro (3 MC + in-basket), ASB/TSB (2 MC compartilhado), Vaga genérica (3 MC nos 4 valores). **"Higienista"→ASB/TSB** (não existe higienista autônoma no Brasil); **coordenador/admin genéricos aposentados**; **+Consultor, +SDR, +Assistente Financeiro** (cargos reais). **Escala graduada 4/2/1/0** (rating com distratores graduados). **Storage Híbrido git→DB**. **Híbrido de fontes** (CFO PESQUISA + formulários reais ancorados nos 4 valores). Anti-cheat (randomização+pool>bateria+timer suave+TCLE), UX (tempo estimado, sem feedback), revisão RH (MC read-only + case override), processo SME-led git-PR V2. 7 bancos + `bars-rubrics-por-dimensao.md` em `docs/conhecimento/sjt/`. |
| **[`PRD-redacao-fit-cultural.md`](./PRD-redacao-fit-cultural.md)** ✅ **Done 2026-05-10** | Substitui `../fit-cultural-prd.md` (DEPRECATED) | Pergunta padrão multivalor "decisão difícil" + 4 templates default por cargo + BARS 4D única (peso Dim4=2×) com pesos por valor variando por cargo (lookup CULTURA-BS) + threshold combo `media≤2.0 OU Dim4=1` configurável por vaga + schema 1 row por (candidatura×pergunta) + UI RH 1 candidato/vez + hard min 200 / soft max 500-600 + sem timer + sem few-shot v1.0 (Fernando deposita exemplos pré go-live → v1.1) + sem detector plágio (consistência sem-detector-ChatGPT). 4 arquivos depositados em `docs/conhecimento/fit-cultural/`. |
| **[`PRD-ai-prompt-library-m2.md`](./PRD-ai-prompt-library-m2.md)** ✅ **Done 2026-05-10** | NOVO | Híbrido git→DB versioning (SemVer + content_hash + schema_version_required); 7 templates frontmatter padronizado; CI sync script `scripts/sync-prompts.ts`; Edge Function `_shared/{ai-client, prompt-loader, audit-logger, pii-masker, circuit-breaker, injection-detector}.ts`; tabelas `prompt_versions`+`ai_call_logs`+`candidate_ai_decisions`+`ai_cost_daily` (AUDITORIA §2 + delta `schema_version_required`); RPCs SECURITY DEFINER (`promote_to_canary`, `promote_canary_to_active`, `rollback_to_version`); admin UI mínima (`/admin/{ai-logs,prompt-versions,ai-costs}`); cost-alerter Edge Function; gold standard pre-deploy (n=30) + trimestral (n=50) + por novo MAJOR; Haiku 4.5 só CV summary, Sonnet 4.6 demais, GPT-4o-mini fallback após circuit OPEN; Anthropic ephemeral 5min; retention forever-while-referenced; 37 RFs + 15 RNFs. CHANGELOG.md + USAGE.md + RUNBOOK.md depositados em `docs/conhecimento/prompts/`. |

### Status das deep researches

| # | Tópico | Prioridade | Status | Localização |
|---|--------|-----------|--------|-------------|
| 1 | ICAR60 PT-BR | 🔴 Alta | ✅ **Done** (2026-04-27) | `docs/conhecimento/icar60/` |
| 2 | Big Five IPIP-NEO PT-BR | 🔴 Alta | ✅ **Done** (2026-04-27) | `docs/conhecimento/big-five/` |
| 3 | Banco SJT/Work Sample odontologia | 🔴 Alta | ✅ **Done** (2026-04-27) | `docs/conhecimento/sjt/` |
| 5 | Prompt Engineering Library | 🟡 Média | ✅ **Done** (2026-04-27) | `docs/conhecimento/prompts/` |

### Materiais adicionais depositados pelo Fernando (Big Five)

- **Curso NotebookLM:** [Big Five — formação completa](https://notebooklm.google.com/notebook/1bdaf389-9e7c-498b-81a6-e7aae7506ca5)
- **5 Word docs interpretativos** (1 por dimensão OCEAN): `Abertura_Experiencia_Big5.docx`, `Amabilidade_Big5.docx`, `Conscienciosidade_Big5.docx`, `Extroversao_Big5.docx`, `Neuroticismo_Big5.docx`
- **Teste validado** (perguntas BFAS — Big Five Aspects Scale, 100 itens): `Big Five.md`
- **Report BFAS validado** (resultado real do Fernando, modelo de qualidade da devolutiva): `report big five.pdf`

Esses materiais alimentarão a Edge Function `gerar-devolutiva-bigfive` via RAG (ver §8.8) e o mini-PRD `PRD-bigfive-revisado.md` (a criar).

---

## 16. Histórico de Mudanças

| Versão | Data | Autor | Mudança |
|--------|------|-------|---------|
| 0.1 | 2026-04-26 | Fernando + Claude | Versão inicial pré-deep-research; síntese da sessão de design colaborativa que cobriu pipeline, IA architecture, schema-key, LGPD framework, estratégia de mini-PRDs |
| **0.2** | **2026-04-27** | **Fernando + Claude** | **4/4 deep researches consumidos. Materiais Big Five depositados (NotebookLM + 5 Word docs + report BFAS validado). 3 lockings novos: (a) agendamento Microsoft Bookings nativo M365 — RF-20a/b/c + RF-25a + tabela `agendamentos_entrevista` + Edge Function `webhook-bookings`; (b) devolutiva Big Five qualitativa por dimensão + texto interpretativo inspirado no formato BFAS — RF-19a/b + tabela `devolutivas_candidato` + Edge Function `gerar-devolutiva-bigfive`; (c) arquitetura RAG via `docs/conhecimento/` formalizada — nova §8.8. RF-15 atualizado com instrumento Big Five confirmado. §10 fechou 4 questões (1, 2, 3, 4). Custo médio por candidato sobe de R$ 0,36 → R$ 0,38 (~+5%, dentro do RNF-10).** |
| **0.3** | **2026-04-28** | **Fernando + Claude** | **Mini-PRD `PRD-bigfive-revisado.md` ✅ done.** Decisões-chave consumidas no Master: (a) RF-15 refinado com instrumento + scoring TS port + cross-check Python; (b) RF-19a refinado com formato D-lite (5 dim + percentil cru + 5 bandas + 5 páginas layout + nomenclatura "Sensibilidade Emocional" pra Neuroticismo); (c) §8.4 EF `gerar-devolutiva-bigfive` refinada (templates + IA híbrido) + EF NOVA `submit-bigfive-final` (anti-tampering + scoring server-side + chamada inline da devolutiva); (d) §8.2 schema `scores_candidato.metadata jsonb` especificado + tabela NOVA `bigfive_respostas_em_progresso`; (e) Q5 do §10 fechada (CFP — psicólogo CRP responsável técnico já contratado pela empresa, será nominalizado pré go-live); (f) decisão lockada original "SEM percentil cru pro candidato" foi conscientemente revogada em favor de alinhamento com referencial BFAS report do Fernando — substituída por "percentil cru COM contexto rico (banda + analogia 100 pessoas + texto interpretativo + disclaimer emocional)". 25 templates oficiais depositados em `docs/conhecimento/big-five/templates-devolutiva.md` (pendente revisão final CRP antes do go-live). |
| **0.4** | **2026-05-10** | **Fernando + Claude** | **Mini-PRD `PRD-redacao-fit-cultural.md` ✅ done.** Decisões-chave consumidas no Master: (a) RF-16 refinado com pergunta padrão `PADRAO_BS` (multivalor "decisão difícil") + 4 templates default por cargo, **hard min 200 / soft max 500-600**, **sem timer**, autosave 30s local + 60s DB; (b) RF-17 refinado com pesos de Dim4 = 2× outras + pesos por valor por cargo via lookup `valores-beauty-smile-resumo.md` + threshold default `media ≤ 2.0 OU Dim4 = 1` configurável por vaga + Zod schema `EssayScoringV1Schema` + style neutralization Rao 2025 + sem few-shot em v1.0 (upgrade pós-piloto pra v1.1); (c) RF-17a NOVO: revisão humana sempre obrigatória, UI 1 candidato/vez, escalonamento "duvida" para gestor, sem devolutiva ao candidato; (d) RF-17b NOVO: sem detector ChatGPT + sem detector plágio em V1 (consistência); (e) §8.1 schema novo: `perguntas_redacao` + `redacoes_candidato` (1 row por candidatura×pergunta) + extensão de `vaga.testes_aplicaveis` jsonb; (f) 4 arquivos RAG depositados em `docs/conhecimento/fit-cultural/` (1 TBD scaffold — Fernando completa pré go-live); (g) PRD original `../fit-cultural-prd.md` (modelo SJT/Likert/Ranking 25 itens) marcado DEPRECATED — banco-itens-v1 segue como referência de cenários para perguntas customizadas. |
| **0.5** | **2026-05-10** | **Fernando + Claude** | **Mini-PRD `PRD-ai-prompt-library-m2.md` ✅ done.** Decisões-chave consumidas no Master: (a) §8.4 EF NOVA `cost-alerter` (Postgres LISTEN + email DPO + recruiter_alerts) + custo médio R$ 0,38 reconfirmado com matriz Haiku/Sonnet detalhada no mini-PRD; (b) §8.7 três decisões NOVAS: AI Prompt Library Híbrido git→DB, modelo otimizado por complexidade (Haiku CV summary + Sonnet demais + GPT-4o-mini fallback após circuit OPEN), versionamento SemVer + content_hash + schema_version_required + retenção forever-while-referenced; (c) §8.8 Princípio 3 REFINADO: prompts via DB query (não filesystem), histórico em git log + DB rows (filename sem suffix `-vN`); (d) §15 mini-PRD AI Prompt Library marcado Done com sumário expandido de 37 RFs + 15 RNFs + estrutura `_shared/` modular substitui `_shared/prompts/*.ts` (era hardcode). Triggers PL/pgSQL imutabilidade + 3 RPCs SECURITY DEFINER (`promote_to_canary`, `promote_canary_to_active`, `rollback_to_version`) + admin UI 3 páginas (`/admin/ai-logs`, `/admin/prompt-versions`, `/admin/ai-costs`) + gold standard pre-deploy/trimestral/MAJOR + Anthropic ephemeral 5min cache + counterfactual PT-BR em CI. CHANGELOG.md + USAGE.md + RUNBOOK.md depositados em `docs/conhecimento/prompts/`. Schema delta sobre AUDITORIA §2: campo `schema_version_required` em `prompt_versions` + nova tabela `known_schema_versions`. |
| **0.6** | **2026-05-12** | **Fernando + Claude** | **Mini-PRD `PRD-redacao-fit-cultural.md` revisado v1.0 → v1.1 em sessão interativa Onda 1-5.** Mudanças no Master: (a) **RF-16 refinado**: pergunta padrão troca de "decisão difícil" (multivalor) para **Opção B** ("cuidar de pessoa em fragilidade/dúvida/insatisfação" — puxa UAU + Atitude de Dono + Sede de Crescimento). 4 templates de cargo passam a oferecer **12 perguntas customizáveis** (3 por cargo) com defaults ON/OFF; junior=1, sênior=2. **Hard min/max 200-500** (sem soft max V1). Autosave 30s local + **30s DB sync** (não 60s). Cronômetro informativo (sem timer rígido); (b) **RF-17 refinado**: BARS 4D com **pesos iguais 25%** V1 (calibrar V2 com Cohen's κ — pesos por cargo viram referência V2). **3 caps especiais**: `red_flag_etico→cap 30`, `D1≤2→cap 50`, `insufficient_evidence` só para inválida. **Sistema 3 cores** (verde ≥65 / amarelo 41-64 / vermelho ≤40 OR red_flag OR D1≤2) substitui threshold numérico. **Few-shot inline cacheado** com 3 exemplos calibrados (Camila L1 / Rodrigo L3 / Mariana L5) — não mais TBD scaffold; (c) **§8.2 schema refinado**: passa de 1 tabela `redacoes_candidato` para **3 tabelas** espelhando padrão Big Five v0.3 — `redacoes_candidato_em_progresso` (autosave) + `redacoes_candidato` (final auditável com `texto_hash`, `classificacao_cor`, `red_flag_etico`, `referencia_match[]`, `bloqueio_avanco`) + `perguntas_redacao` (banco 13 rows seed = 1 PADRAO_BS + 12 customizáveis); (d) **§8.4 EF nova**: `submit-redacao` (anti-tampering similar a `submit-bigfive-final` — valida word_count server-side, computa hash, INSERT em `redacoes_candidato`, chama `avaliar-redacao` síncrono); `avaliar-redacao` agora aplica caps especiais determinísticos + classificação 3 cores + verificação hash anti-plágio intercandidato pré-INSERT; (e) **Hash anti-plágio sha256** intercandidato em V1 (flag sem bloqueio automático; revisão humana decide); (f) UI gestor 1 redação por vez V1 com sidebar de pendentes filtrada por cor + atalhos teclado (J/K/A/R/D); comparativo lado-a-lado movido para V2; (g) ASB usa template `recepcao_padrao` em V1; Gestor regional usa `coord_admin_padrao` em V1 (templates dedicados em V2 se houver volume); (h) 4 arquivos RAG em `docs/conhecimento/fit-cultural/` atualizados para v1.1: pergunta-padrao (12 templates), bars (pesos iguais + 3 caps + sistema 3 cores), exemplos (3 redações completas com scoring justificado), valores-resumo (nota pesos V1). Custo médio por candidato ajustado: 2-3 redações × R$ 0,025 → R$ 0,05-0,075/candidato em redação (dentro do RNF-10 R$ 0,50 total).** |
| **0.7** | **2026-06-05** | **Fernando + Claude** | **Mini-PRD `PRD-cognitivo-raciocinio.md` ✅ done — pivot do ICAR60.** Decisão de viabilidade: Deep Research #1 confirmou ICAR60 **inviável** (licença non-commercial + zero validação PT-BR + fora SATEPSI + sem normas BR). **Pivot lockado:** prova técnica de **raciocínio lógico** (matriz + letra-número, itens CC0 do Harvard Dataverse), reposicionada como **não-psicológica** (fora SATEPSI/CFP — não exige psicólogo, diferente do Big Five). Mudanças no Master: (a) **RF-26 refinado**: presencial→**online com proctoring leve**, `tipo='icar60'`→`tipo='raciocinio_logico'`, resultado em **banda qualitativa 5 faixas** (sem percentil/QI), badge contextual; (b) **RF-27 mantido** + grava em `bias_audit_log`; (c) **§8.2 schema novo**: `scores_candidato` tipo `raciocinio_logico` + metadata jsonb especificado + tabela `cognitivo_respostas_em_progresso` (autosave, espelha Big Five) + EF `submit-cognitivo-final` (CTT server-side anti-tampering); (d) **funil**: cognitivo move da Etapa 5 presencial → **Etapa 3 assíncrona** (Phase 2), ao lado de SJT/Big Five; (e) §3b fora-do-escopo: ICAR60-as-instrumento + verbal + 3D + percentil/QI; (f) §9 risco 1 RESOLVIDO; §10 Q1 fechada com pivot; (g) reusa shell `TesteRavenPage.tsx` (UI), mas scoring/persistência/anti-cheat/item-model são net-new (itens CC0 = enunciado+alternativas discretas vs imagem composta Raven). 4 artefatos depositados em `docs/conhecimento/icar60/`. ⚠️ Ação P0 pendente (Q-C5): auditar git history por imagens Raven legadas → `git filter-repo` se necessário. |
| **0.8** | **2026-06-05** | **Fernando + Claude** | **Mini-PRD `PRD-sjt-work-sample-odontologia.md` ✅ done — último mini-PRD derivado.** Decisões consumidas no Master: (a) **RF-13 refinado**: escala graduada **4/2/1/0** (`fortemente_pontua`=4 · `pontua`=2 · `neutro`=1 · `atencao`=0+flag) substitui "1 certo + 3 zeros"; threshold `< 60% do máx OU ≥1 atencao` → revisão humana; (b) **RF-14 refinado**: case aberto/work-sample/in-basket nos cargos híbridos (dentista, consultor de vendas, SDR, assistente financeiro) via `avaliar-redacao` + template `07-work-sample-sjt`; threshold `< 13/25 OU red flag`; (c) **RF-33 refinado**: templates de vaga pelos **cargos reais Beauty Smile** (taxonomia derivada de [`perguntas-vagas.md`](../../conhecimento/perguntas-vagas.md)) — aposenta `coord_admin_padrao`/`freela_simples` genéricos; **"higienista"→ASB/TSB**; +Consultor de Vendas Premium, +SDR/Social Seller, +Assistente Financeiro, +Vaga genérica; (d) **Storage Híbrido git→DB** (mesmo padrão da AI Prompt Library — markdown source of truth + CI `sync-sjt.ts` hidrata `perguntas`+`pergunta_opcao_metadata` + runtime lê só DB; descarta repo separado da PESQUISA §7); (e) **híbrido de fontes**: SJTs CFO da PESQUISA (lastro ético-clínico dentista/TSB) + SJTs minerados dos formulários reais ancorados nos 4 valores; (f) anti-cheat (randomização ordem + pool>bateria + timer suave + cláusula TCLE), UX (tempo estimado, navega dentro do bloco, sem feedback de acerto), revisão RH (MC read-only + case BARS override + decisão humana sempre), processo SME-led git-PR com ciclo de vida (draft/piloting/active/retired) em V2; (g) 7 bancos + `bars-rubrics-por-dimensao.md` depositados em `docs/conhecimento/sjt/`; (h) **knockout "não fazemos harmonização orofacial"** identificado nos formulários → vai pra Etapa 1 (RF-02). **Todos os 5 mini-PRDs derivados concluídos** — Master pronto para consolidação v1.0.** |
| **1.0** | **2026-06-06** | **Fernando + Claude** | **Consolidação final — versão congelada para abertura do M2.** Todos os 5 mini-PRDs derivados (Big Five v0.3 · Redação fit-cultural v0.4→v0.6 · AI Prompt Library v0.5 · Cognitivo-raciocínio v0.7 · SJT/Work Sample v0.8) ✅ concluídos e suas decisões já absorvidas incrementalmente no corpo do Master (§6 RFs, §8 schema/EFs, §8.7 decisões técnicas, §8.8 RAG). Mudanças nesta consolidação: (a) header → Status "Consolidado v1.0", Versão 1.0, Última revisão 2026-06-06; (b) §15 "Updates rumo a v1.0" — 3 itens pendentes marcados ✅ Done (RF-19a formato devolutiva v0.3, templates devolutiva v0.3, RF-26 pivot cognitivo v0.7); (c) nenhuma decisão de design nova — esta é uma versão de **freeze/sign-off**, não de novo conteúdo. **Pipeline 6 etapas + 5 instrumentos avaliativos (Etapa 3) + camada IA 7 pontos + cost-alerter** especificados e estáveis. **Ações P0 — decididas por Fernando em 2026-06-06:** (1) ~~auditar git history por imagens Raven legadas~~ **NÃO será feito** — risco residual conscientemente aceito (itens Raven aposentados pelo pivot p/ raciocínio CC0; ver changelog v0.7); (2) ~~nominalizar psicólogo CRP na devolutiva Big Five~~ **NÃO** — a devolutiva não nomeará um CRP específico, consistente com a linguagem de produto "avaliação comportamental/cognitiva" (nunca "teste psicológico") — RF-19a ajustado abaixo; (3) ✅ **mantida** — revisão final do responsável técnico (CRP) sobre os 25 templates de devolutiva Big Five antes do go-live. **Próximo passo:** fechar M1 (Phase 5 + confirmar Phase 3) → `/gsd-complete-milestone` (M1) → `/gsd-new-milestone` (M2) → `/gsd-discuss-phase` consumindo este Master + os 5 mini-PRDs como input. |
| **1.1** | **2026-06-06** | **Fernando + Claude** | **Etapa 1 reespecificada a partir da análise do funil legado de 2 portões (`docs/conhecimento/perguntas-vagas.md`, 6 formulários reais).** Mudanças na §6.1: (a) **RF-01 ampliado** — inclui data de nascimento, pretensão salarial, nível de inglês, "como conheceu a vaga", LinkedIn, Instagram (por cargo); **remove** "fontes de renda" + "por que você trabalha" + "prioridades atuais" + gate "seguir 3 perfis" (minimização LGPD + redundância com a redação da Etapa 3); (b) **RF-01a NOVO** — bloco de qualificação estruturada por template de cargo na Etapa 1 (Opção 1 "enxuta": máx 10 perguntas/cargo, máx 1 aberta, teto 15 min), substitui a qualificação técnica que o Form 2 legado coletava; schema novo `vaga.qualificacao_etapa1` jsonb; vira input estruturado da IA da Etapa 2 + filtros do painel RH; (c) **RF-02 — knockouts padrão**: presencial-SP (todos os cargos) + harmonização orofacial (dentista); (d) **decisão data de nascimento**: coletada e **visível na triagem** (escolha consciente de Fernando, risco de discriminação por idade aceito) — RNF-07b deve monitorar faixa etária na auditoria de viés como trilha de defesa; (e) nota de design no §6.1 documentando o mapeamento legado→M2 (funil 2 portões preservado, agora auditável + IA). **Decisões P0 fechadas em 2026-06-06** (ver linha 1.0 acima): git-history Raven não será auditado · CRP não nominalizado na devolutiva · revisão CRP dos templates mantida. |
