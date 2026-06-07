# Prompts para Mini-PRDs M2 — Sessões Dedicadas

5 prompts auto-contidos pra abrir uma janela nova por mini-PRD. Cada prompt:
- Carrega contexto sem depender da conversa de design original
- Aciona a skill `skill-prd` no modo CRIAR
- Pede iteração (Claude pergunta antes de inventar)
- Define entregáveis claros (mini-PRD + atualização do Master + atualização do README)

**Ordem sugerida (não obrigatória):** 1 → 2 → 3 → 4 → 5

---

## 📄 Prompt 1 — PRD-bigfive-revisado.md (RECOMENDADO COMEÇAR POR ESTE)

```
Vamos criar o mini-PRD do Big Five revisado para o M2 (Funil RH) do Sistema 
de Recrutamento Beauty Smile. Quero que você USE A SKILL `skill-prd` no modo 
CRIAR e ITERE comigo (pergunte antes de inventar — não execute autônomo).

## Contexto a carregar antes de começar (nessa ordem):
1. Memory do projeto (vai estar carregada automaticamente)
2. `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` (Master v0.2 atual — leia §6.3 RF-15/19a/19b, §8.2 tabela `devolutivas_candidato`, §8.4 Edge Function `gerar-devolutiva-bigfive`, §8.8 RAG architecture)
3. `docs/prds/m2-funil-rh/README.md`
4. `docs/conhecimento/big-five/README.md` — índice da knowledge base
5. `docs/conhecimento/big-five/PESQUISA-big-five-ipip-neo-120-ptbr.md` — pesquisa científica completa
6. `docs/conhecimento/big-five/Big Five.md` — perguntas do teste BFAS (referência de formato)
7. `docs/conhecimento/big-five/report big five.pdf` — meu report BFAS validado (REFERÊNCIA DE QUALIDADE da devolutiva)
8. `docs/conhecimento/big-five/fontes/ipip-neo-120-questions-pt-br.json` — item bank PT-BR confirmado
9. Os 5 Word docs por dimensão (Abertura_Experiencia, Amabilidade, Conscienciosidade, Extroversao, Neuroticismo) — material interpretativo PT-BR
10. `docs/prds/bigfive-prd.md` — PRD original (será SUBSTITUÍDO por este mini-PRD)
11. (Opcional) Curso NotebookLM: https://notebooklm.google.com/notebook/1bdaf389-9e7c-498b-81a6-e7aae7506ca5 — se eu autorizar, use a skill `notebooklm` pra extrair pontos-chave do curso

## Decisões já lockadas (NÃO revisar):
- Instrumento: IPIP-NEO-120 PT-BR (item bank JSON confirmado). Plan B: BFI-2 PT-BR (Pires 2023)
- Papel no funil: CONTEXTUAL, NÃO eliminatório (informa gestor, não filtra)
- Aplicação: assíncrona online pelo candidato (Etapa 3 do funil)
- Devolutiva: textual COM pontuação QUALITATIVA por dimensão (alto/médio/baixo + texto interpretativo ~150 palavras por dimensão) — inspirada no formato BFAS do meu report
- SEM percentil numérico cru pro candidato (evita comparação fria + contestação)
- RAG via `docs/conhecimento/big-five/` (filesystem)

## Decisões a refinar nesta sessão (ME PERGUNTE):
1. Algoritmo exato de scoring IPIP-NEO-120 (mapping de 120 itens → 5 dimensões OCEAN + 30 facetas; reverse-coded items)
2. Granularidade da devolutiva: 5 dimensões só, ou 5 + as 30 facetas (mais rico mas mais longo)?
3. Templates de texto interpretativo por dimensão × nível (alto/médio/baixo) — extrair dos 5 Word docs PT-BR + adaptar com tom Beauty Smile
4. UX da aplicação: timer total? autosave a cada N? bloqueio de back após avançar? quantos itens por tela (1, 5, 10, todos)?
5. Posicionamento legal CFP/SATEPSI: nomenclatura "questionário de perfil comportamental" (NÃO "teste psicológico") — quem assina como responsável técnico se necessário? Q5 do §10 do Master ainda aberta
6. Schema DB: `scores_candidato` recebe scores OCEAN + facetas em jsonb? `devolutivas_candidato` armazena texto gerado por IA?
7. Triggers exatos: quando dispara `gerar-devolutiva-bigfive`? Email + in-app? Ou só in-app?
8. Plan B detalhado: se IPIP-NEO der problema operacional (item rejeitado, scoring divergente), como pivotar pra BFI-2 sem refazer tudo?

## Entregáveis ao final:
1. `docs/prds/m2-funil-rh/PRD-bigfive-revisado.md` (Standard ou Comprehensive — você decide pela complexidade)
2. Atualizar `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md`:
   - §15 mover linha "PRD-bigfive-revisado.md" de "Sessão futura" → "✅ Done [data]"
   - §16 adicionar linha v0.3 com mudança
   - Se algo essencial emergir, refinar RFs relacionados (RF-15, RF-19a, RF-19b)
3. Atualizar `docs/prds/m2-funil-rh/README.md` (status do mini-PRD)
4. Atualizar `docs/prds/bigfive-prd.md` adicionando aviso no topo: "⚠️ DEPRECATED — substituído por `m2-funil-rh/PRD-bigfive-revisado.md` desde [data]. Mantido como referência histórica."
5. Atualizar memory `project_m2_funil_design.md` com data de criação + 1 linha do que mudou

## Estilo de iteração:
- Pergunte 1-3 perguntas por vez, não 8 de uma vez
- Apresente opções com prós/contras quando houver trade-off
- Mostre exemplo concreto antes de pedir decisão (ex: "ó, ficaria assim: [snippet] — OK?")
- Quando inventar (ex: template de texto interpretativo), MOSTRE primeiro pra eu validar antes de gravar no PRD
- No final, antes de criar o arquivo, faça scorecard de qualidade do skill-prd (modo VALIDAR)

Vamos começar.
```

---

## 📄 Prompt 2 — PRD-redacao-fit-cultural.md

```
Vamos criar o mini-PRD da Redação Fit Cultural para o M2 (Funil RH) do 
Sistema de Recrutamento Beauty Smile. USE A SKILL `skill-prd` no modo CRIAR 
e ITERE comigo.

## Contexto a carregar antes de começar:
1. Memory do projeto (auto-carregada)
2. `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` (leia §6.3 RF-16/17, §8.2 tabela `redacoes_candidato`, §8.4 Edge Function `avaliar-redacao`, §8.8 RAG)
3. `docs/conhecimento/fit-cultural/README.md`
4. `docs/prds/CULTURA-BEAUTY-SMILE-INPUT.md` (383 linhas — manifesto + valores Beauty Smile)
5. `docs/prds/fit-cultural-banco-itens-v1.md` (839 linhas — banco de itens já gerado)
6. `docs/prds/fit-cultural-prd.md` (976 linhas — PRD original que será SUBSTITUÍDO)
7. `docs/conhecimento/prompts/templates/06-culture-fit-essay.md` — template de prompt já pronto pra adaptar

## Decisões já lockadas:
- Formato: redação 200-500 palavras, 1 pergunta padrão Beauty Smile + 1-2 customizáveis por vaga
- Avaliação: IA com BARS 4D + revisão humana
- Eliminatório (com revisão humana, sem auto-rejeição)
- 4 dimensões BARS: especificidade situação | ação demonstrada | aprendizado | alinhamento valores
- SEM devolutiva pro candidato (eliminatório expõe critério)
- NÃO detectar ChatGPT (unreliável); follow-up ao vivo na entrevista online (Etapa 4)
- RAG via `docs/conhecimento/fit-cultural/` + reuso CULTURA-BEAUTY-SMILE-INPUT + banco-itens-v1

## Decisões a refinar (ME PERGUNTE):
1. Pergunta padrão exata Beauty Smile — proposta atual: "Descreva uma situação em que precisou lidar com um paciente/cliente difícil ou insatisfeito. O que aconteceu, como agiu e o que aprendeu?" — ajustar?
2. 3-5 perguntas customizáveis por vaga (banco de templates por cargo: dentista, recepção, coord, admin)
3. BARS detalhado por dimensão (1-5 com âncoras concretas) — extrair valores do CULTURA-BEAUTY-SMILE-INPUT + benchmark com banco-itens-v1
4. 3 redações EXEMPLO por nível (1, 3, 5) com justificativa de scoring — pra few-shot do prompt e pra calibrar avaliadores humanos
5. Threshold eliminatório: score mínimo X em alguma dimensão? média < N pontos? consenso humano-IA?
6. Limite de tempo (sem timer rígido vs timer suave de 30min)
7. Validação no submit: min 200 / max 500 palavras é client-side ou server? autosave a cada quantos segundos?
8. Schema `redacoes_candidato`: armazena texto bruto + análise IA jsonb + flags + nota humana?
9. Como gestor revisa em UI: 1 redação por vez ou comparativo lado-a-lado?
10. Política se candidato copia/cola redação de outro candidato (anti-plagio)?

## Entregáveis ao final:
1. `docs/prds/m2-funil-rh/PRD-redacao-fit-cultural.md`
2. Atualizar Master (`PRD-MASTER-funil-rh-m2.md`): §15 status, §16 changelog, refinar RF-16/17 se necessário
3. Atualizar README da pasta m2-funil-rh
4. Marcar `docs/prds/fit-cultural-prd.md` como DEPRECATED com aviso no topo
5. Depositar templates derivados em `docs/conhecimento/fit-cultural/`:
   - `valores-beauty-smile-resumo.md`
   - `pergunta-padrao-redacao.md`
   - `bars-redacao-4-dimensoes.md`
   - `exemplos-respostas-bars.md` (3 exemplos por nível 1/3/5)
6. Atualizar memory

## Estilo de iteração:
Igual ao Prompt 1: poucas perguntas por vez, opções com prós/contras, exemplos concretos antes de gravar.

Vamos começar.
```

---

## 📄 Prompt 3 — PRD-sjt-work-sample-odontologia.md

```
Vamos criar o mini-PRD do SJT/Work Sample customizado por cargo para o M2 
(Funil RH) do Sistema de Recrutamento Beauty Smile. USE A SKILL `skill-prd` 
modo CRIAR e ITERE comigo.

## Contexto a carregar antes de começar:
1. Memory do projeto (auto-carregada)
2. `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` (leia §6.3 RF-11/13/14, §6.7 RF-33/34/35/36, §8.2 tabela `pergunta_opcao_metadata`)
3. `docs/conhecimento/sjt/README.md`
4. `docs/conhecimento/sjt/PESQUISA-sjt-odontologia-beauty-smile.md` — deep research completa
5. `docs/conhecimento/sjt/fontes/sjt-plataformas-comerciais-exemplos-publicos.md`
6. `docs/conhecimento/prompts/templates/07-work-sample-sjt.md` — template prompt pronto
7. `docs/prds/PRD-MASTER-sistema-recrutamento.md` §10 (mini-PRDs originais como referência)

## Decisões já lockadas:
- Formato por cargo:
  - Recepção / Higienista: 100% múltipla escolha (scoring automático via tags+pesos, sem IA)
  - Coordenador / Dentista: HÍBRIDO (múltipla escolha + 1 case aberto avaliado por IA com BARS)
  - Admin: múltipla escolha + in-basket curto
- Tempo: 15-30min por cargo
- Eliminatório com revisão humana (não auto-rejeita)
- Tags por opção obrigatórias (knockout/atencao/neutro/pontua/fortemente_pontua + peso + nota_ia)

## Decisões a refinar (ME PERGUNTE):
1. Para CADA um dos 5 cargos (dentista, higienista, recepção, coordenador, admin), criar 2-3 SJTs prontos:
   - Cenário descrito (1-2 parágrafos realistas Beauty Smile)
   - 4 alternativas de resposta
   - Tag + peso por alternativa
   - Dimensão avaliada (ex: empatia, priorização, comunicação)
   - Para dentista/coordenador: case aberto adicional com BARS de avaliação IA
2. Validar com pesquisa quais SJTs públicos podem servir como modelo (cita fontes)
3. Threshold eliminatório por cargo (score mínimo absoluto? percentil entre candidatos?)
4. Como armazenar no DB:
   - SJTs como rows em `perguntas` + `pergunta_opcao_metadata`?
   - JSON em `vaga_testes_aplicaveis`?
   - Markdown versionado em `docs/conhecimento/sjt/banco-*.md` carregado por Edge Function?
5. Processo SME-led de criação/curadoria de novos SJTs em V2 (workflow de aprovação)
6. UX da aplicação: tempo total visível? candidato pode pular e voltar? feedback após responder?
7. Como o gestor RH revisa scoring de SJT: tela mostra resposta + tag selecionada + peso + total; consegue override?
8. Anti-cheat: como evitar candidato pesquisar resposta no Google? (timer apertado? randomização ordem alternativas?)

## Entregáveis ao final:
1. `docs/prds/m2-funil-rh/PRD-sjt-work-sample-odontologia.md`
2. Atualizar Master: §15 status, §16 changelog, refinar RF-11/13/14 se necessário
3. Atualizar README da pasta m2-funil-rh
4. Depositar bancos iniciais em `docs/conhecimento/sjt/`:
   - `banco-sjt-dentista.md` (2-3 SJTs)
   - `banco-sjt-higienista.md` (2-3 SJTs)
   - `banco-sjt-recepcao.md` (4-5 SJTs)
   - `banco-sjt-coordenador.md` (3-4 SJTs)
   - `banco-sjt-admin.md` (4-5 SJTs)
   - `bars-rubrics-por-dimensao.md` (templates BARS reutilizáveis)
5. Atualizar memory

## Estilo de iteração:
Comece pelo cargo mais simples (recepção) pra calibrar formato com você. Depois replica nos outros. Pergunte 1 cargo por vez, não 5 de uma vez.

Vamos começar.
```

---

## 📄 Prompt 4 — PRD-icar60-cognitivo.md

```
Vamos criar o mini-PRD do ICAR60 (cognitivo presencial) para o M2 (Funil RH) 
do Sistema de Recrutamento Beauty Smile. USE A SKILL `skill-prd` modo CRIAR 
e ITERE comigo.

## Contexto a carregar antes de começar:
1. Memory do projeto (auto-carregada)
2. `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` (leia §6.5 RF-26/27, §8.2 `scores_candidato`, §3b sobre Raven descartado)
3. `docs/conhecimento/icar60/README.md`
4. `docs/conhecimento/icar60/PESQUISA-icar60-cognitivo.md` — deep research completa (LEIA INTEGRAL antes de decidir)
5. `docs/conhecimento/icar60/fontes/alternativas-icar60-testes-cognitivos-brasil.md` — plan B mapeado
6. `docs/prds/cognitivo-icar-prd.md` — PRD original que será ATUALIZADO/SUBSTITUÍDO
7. `docs/prds/raven-onboarding-prd.md` — PRD do Raven (deprecated, marcar como tal)

## Decisões já lockadas:
- Aplicação: PRESENCIAL (Etapa 5 do funil), nunca online (anti-cheat)
- Opt-in por vaga (campo `vaga.aplica_cognitivo` boolean, default false)
- Papel: CONTEXTUAL, não eliminatório (informa gestor, não filtra)
- Rejeitar candidato com score baixo isolado exige justificativa expandida (RF-27)
- Substitui Raven (descartado por SATEPSI + Pearson + adverse impact)
- Bias audit obrigatório (regra 4/5 EEOC) — score ICAR pode mascarar discriminação

## Decisões a refinar (ME PERGUNTE):
1. **CRÍTICO — viabilidade:** A pesquisa #1 confirmou versão validada PT-BR ou pivota pro plan B? Leia primeiro, decida, e me apresente o caminho
2. Item bank exato: 60 itens, mas quais subdomínios (verbal, numérico, raciocínio matricial, rotação 3D)? Pesquisa indica?
3. Onde baixar item bank oficial (icar-project.com tem download direto?) e licenciamento (CC0 confirmado?)
4. Algoritmo de scoring: IRT (Item Response Theory) ou soma simples? Cálculo de percentil contra que população (internacional? brasileira se houver normas)?
5. Apresentação do resultado pro gestor: percentil cru? banda qualitativa (alto/médio/baixo)? interpretação textual gerada por IA?
6. UX presencial:
   - Mesmo dia da entrevista presencial ou em dia separado?
   - Quem aplica (RH? gestor? auto-aplicado em sala isolada?)
   - Anti-cheat: papel/lápis vs tablet com fullscreen lock vs supervisão direta?
   - Tempo total + tempo por seção?
7. Quem assina como responsável técnico se CFP exigir (psicólogo)? Posicionamento como "avaliação cognitiva" não "teste psicológico"?
8. Plan B detalhado: se ICAR60 não rolar (sem versão PT-BR validada, sem normas BR, custo proibitivo), qual instrumento substitui (BPR-5 brasileiro proprietário? Wonderlic com adverse impact mitigado? só SJT presencial sem cognitivo puro)?
9. Schema DB: `scores_candidato` tipo='icar60' armazena pontuação total + por seção + percentil + banda qualitativa?
10. Como apresentar no comparativo (Etapa 6) sem virar critério único de decisão?

## Entregáveis ao final:
1. `docs/prds/m2-funil-rh/PRD-icar60-cognitivo.md`
2. Atualizar Master: §15 status, §16 changelog, refinar RF-26/27, atualizar §10 questão 5 se aplicável
3. Atualizar README da pasta m2-funil-rh
4. Marcar `docs/prds/raven-onboarding-prd.md` como DEPRECATED com aviso no topo
5. Atualizar `docs/prds/cognitivo-icar-prd.md` (apontar pro novo) ou marcar como ATUALIZADO POR
6. Depositar artefatos em `docs/conhecimento/icar60/`:
   - `item-bank-icar60.md` (ou JSON se rolar baixar)
   - `scoring-algorithm.md`
   - `interpretacao-contextual.md` (templates pro gestor)
   - `bias-mitigation-icar.md`
7. Atualizar memory

## Estilo de iteração:
COMECE pela viabilidade (questão 1). Se não rolar ICAR60, todo o resto muda. Não desperdice tempo desenhando UI antes de saber se o instrumento existe.

Vamos começar.
```

---

## 📄 Prompt 5 — PRD-ai-prompt-library-m2.md

```
Vamos criar o mini-PRD da AI Prompt Library para o M2 (Funil RH) do Sistema 
de Recrutamento Beauty Smile. USE A SKILL `skill-prd` modo CRIAR e ITERE 
comigo.

## Contexto a carregar antes de começar:
1. Memory do projeto (auto-carregada)
2. `docs/prds/m2-funil-rh/PRD-MASTER-funil-rh-m2.md` (leia §8.4 Edge Functions table, §8.7 decisões técnicas, §8.8 RAG architecture)
3. `docs/conhecimento/prompts/README.md` — índice da pasta
4. `docs/conhecimento/prompts/PESQUISA-prompt-library-ats.md` — deep research completa
5. `docs/conhecimento/prompts/AUDITORIA-LGPD-LOGGING-VERSIONING.md` — guia de auditoria
6. `docs/conhecimento/prompts/templates/00-shared-zod-schemas.ts` — schemas Zod compartilhados
7. `docs/conhecimento/prompts/templates/08-edge-function-reference.ts` — reference implementation
8. Os 7 templates de prompt (01-07) na mesma pasta — leia TODOS
9. `docs/conhecimento/prompts/fontes/*` (5 fontes técnicas)

## Decisões já lockadas:
- Stack: Edge Functions Deno + Supabase, Anthropic Claude Sonnet 4.6 default
- Anthropic prompt caching para vaga + rubric (parte estável do contexto)
- Output JSON via tool use + Zod validation
- 8 templates já depositados (00-shared + 7 usos + 08-reference)
- Logging obrigatório: prompt_version, model_version, custo_tokens, input_hash, output, candidatura_id (LGPD Art. 20)
- RAG via filesystem (`docs/conhecimento/`) carregado em cold start

## Decisões a refinar (ME PERGUNTE):
1. Versionamento exato:
   - Semver (v1.0.0)? Hash content-addressed? Date+counter (v1, v2)?
   - Como sinalizar breaking change (ex: schema Zod muda) vs refinement?
   - Política de manter versões antigas (forever? 90 dias? até última candidatura usá-las?)
2. Estrutura de cada prompt template:
   - System prompt + user message no mesmo arquivo .md ou separados?
   - Zod schema inline no .md ou import do 00-shared?
   - Few-shot examples no template ou em arquivo separado?
3. Como Edge Function CARREGA template em runtime:
   - filesystem read em cold start (Deno cache)?
   - Carregamento on-demand por chamada?
   - Bundle como import estático no build?
4. Modelo IA por uso (override do default Sonnet 4.6):
   - Quais usos podem usar Haiku 4.5 (mais barato/rápido)?
   - Quais SEMPRE Sonnet (qualidade crítica)?
   - GPT-4o como fallback se Anthropic down?
5. Cache strategy:
   - Que chunks marcar como cacheable (vaga, rubric, system prompt)?
   - TTL (5min default Anthropic ou customizar)?
   - Métricas de cache hit rate
6. Logging unificado:
   - Tabela `ai_call_log` com schema fixo?
   - Retenção (90 dias? até case LGPD requerer histórico)?
   - Exposição read-only via endpoint admin?
7. Bias mitigation no prompt:
   - Blind scoring (omitir nome/demografia do input)?
   - Múltiplas runs + variância?
   - Validação cruzada periódica vs gold standard
8. Custo monitoring:
   - Alerta se candidato passa de R$ 1,00 (vs R$ 0,38 esperado)?
   - Dashboard interno de custo por Edge Function por mês?
9. Fallback se Anthropic API down:
   - Retry exponential backoff (quantas vezes)?
   - Fallback pra GPT-4o ou só erro 503?
   - Circuit breaker pattern?

## Entregáveis ao final:
1. `docs/prds/m2-funil-rh/PRD-ai-prompt-library-m2.md`
2. Atualizar Master: §15 status, §16 changelog, refinar §8.4 + §8.7 + §8.8 com decisões finais
3. Atualizar README da pasta m2-funil-rh
4. Refinar/versionar templates em `docs/conhecimento/prompts/templates/`:
   - Renomear arquivos com versão (ex: `01-cv-summary.md` → `01-cv-summary-v1.md`)
   - Adicionar header padronizado em cada (system_prompt, user_template, output_schema, version, changelog)
   - Criar `docs/conhecimento/prompts/CHANGELOG.md` (versionamento global)
5. Criar `docs/conhecimento/prompts/USAGE.md` (como Edge Functions consomem — exemplo concreto)
6. Atualizar memory

## Estilo de iteração:
COMECE perguntando sobre versionamento (questão 1) — é a decisão mais transversal. As outras dependem dela. Pergunte 1-2 questões por vez.

Vamos começar.
```

---

## Workflow recomendado

```
Janela 1 (você abre nova conversa nesta pasta):
  → cola Prompt 1 → trabalha PRD-bigfive-revisado.md → ✅ done

Janela 2 (nova conversa):
  → cola Prompt 2 → trabalha PRD-redacao-fit-cultural.md → ✅ done

Janela 3, 4, 5: idem.

Cada janela:
  - Memory carrega contexto do M2 automaticamente
  - Skill skill-prd estrutura o PRD
  - Você itera com Claude (não autônomo)
  - Final: mini-PRD criado + Master atualizado + README atualizado + memory atualizada
  - Quando todos 5 estiverem prontos: Master sobe pra v1.0 → /gsd-discuss-phase
```

**Ordem recomendada:** 1 (Big Five — mais material) → 2 (Redação — reusa muito do existente) → 3 (SJT — mais trabalho de criação) → 4 (ICAR — depende de viabilidade do instrumento) → 5 (Prompt Library — consolida aprendizados de 1-4)

**Para cada prompt:** abra Claude Code nesta pasta (`/Users/fernando/Cursor Repo/DB Sistema de recrutamento`), cole o prompt inteiro, e deixe rolar.
