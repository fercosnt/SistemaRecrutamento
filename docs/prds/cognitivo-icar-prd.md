> # ♻️ SUPERSEDED / ATUALIZADO POR (2026-06-05)
>
> **Este PRD legado tratava o cognitivo como FILTRO ELIMINATÓRIO via ICAR Matrix Reasoning.** Duas premissas mudaram:
> 1. **ICAR como instrumento foi descartado** — Deep Research #1 confirmou 4 bloqueios (licença non-commercial + zero validação PT-BR + fora SATEPSI + sem normas BR).
> 2. **O papel mudou de eliminatório → contextual** (RF-27): o sistema NUNCA rejeita por score isolado.
>
> **Atualizado por:** [`m2-funil-rh/PRD-cognitivo-raciocinio.md`](./m2-funil-rh/PRD-cognitivo-raciocinio.md) — prova técnica de raciocínio lógico (itens **CC0** do Harvard Dataverse, não o item bank non-commercial do icar-project), **online com proctoring leve**, **não-psicológica**, **contextual**, banda qualitativa (sem percentil/QI). Mantém-se aqui apenas como referência histórica do raciocínio de design.
>
> ---

# Mini-PRD: Teste Cognitivo (ICAR Matrix Reasoning)

**Autor:** Fernando Costa · **Data:** 2026-04-19 · **Status:** ♻️ SUPERSEDED por `PRD-cognitivo-raciocinio.md` (era: Draft)
**Upstream:** `docs/prds/PRD-MASTER-sistema-recrutamento.md` §10.3 · **Substitui PRD antigo:** `docs/prds/0009-prd-teste-raven.md` (reposicionado para onboarding em §10.3.1 do master)
**Sistema:** Beauty Smile — Rede brasileira de clínicas odontológicas — Sistema de Recrutamento
**Idioma da aplicação:** pt-BR · **Regime legal:** LGPD + CFP Res. 031/2022 (SATEPSI)

---

## Sumário

1. [Papel no Sistema](#1-papel-no-sistema--filtro-eliminatório-com-revisão-humana)
2. [Por que ICAR (não Raven)](#2-por-que-icar-não-raven)
3. [O que é ICAR Matrix Reasoning](#3-o-que-é-icar-matrix-reasoning)
4. [Subset escolhido](#4-subset-escolhido-icar-matrix-reasoning-completo-11-itens)
5. [Origem dos itens e das imagens](#5-origem-dos-itens-e-das-imagens)
6. [Formato de Aplicação](#6-formato-de-aplicação)
7. [Cálculo de Score](#7-cálculo-de-score)
8. [Modelo de Dados (SQL DDL)](#8-modelo-de-dados-sql-ddl)
9. [UX Detalhada](#9-ux-detalhada)
10. [Integração com perfil ideal da vaga](#10-integração-com-perfil-ideal-da-vaga)
11. [Anti-cola e Segurança](#11-anti-cola-e-segurança)
12. [LGPD](#12-lgpd)
13. [Gaps e Decisões Pendentes](#13-gaps-e-decisões-pendentes)
14. [Referências Bibliográficas](#14-referências-bibliográficas)

---

## 1. Papel no Sistema — FILTRO ELIMINATÓRIO (com revisão humana)

| Atributo | Valor |
|---|---|
| **Classificação** | **Filtro eliminatório com revisão humana obrigatória** (princípio RNF-07a do master) |
| **Quando aplicar** | Etapa `testes_async` (pipeline §9 do master). Roda em paralelo com Big Five, DISC, Cultural — ordem à escolha do candidato |
| **Cargos-alvo** | Vagas com demanda cognitiva: dentistas, coordenadores regionais, gestores de clínica, analistas financeiros. Vagas operacionais (recepcionista, auxiliar de limpeza) podem desligar o teste via `vaga_testes_aplicaveis.aplicar = 'nao_aplicar'` |
| **Eliminatoriedade** | Sinaliza **badge vermelho** no kanban do RH quando `score_principal < vaga_testes_aplicaveis.threshold_eliminatorio`. **Não move o candidato automaticamente** — um recrutador sempre revisa antes de rejeitar (LGPD Art. 20 — direito à revisão humana de decisão automatizada) |
| **SLA** | 7 dias corridos da aprovação na triagem (SLA geral da etapa `testes_async`) |
| **Obrigatoriedade por candidato** | Se a vaga marca ICAR como `aplicar = 'obrigatorio'`, o candidato **não pode** pular; se `opcional`, aparece com badge "Recomendado" |

**Regra de negócio-chave:** `score_principal` do ICAR é um dos inputs da fórmula de score agregado da candidatura (ponderada pelos pesos em `vaga_testes_aplicaveis.peso`). Porém, se o ICAR for eliminatório e o candidato ficar abaixo do threshold, o kanban do RH destaca com flag visível para revisão.

---

## 2. Por que ICAR (não Raven)

### 2.1 O problema do Raven no Brasil

As **Raven's Progressive Matrices** (SPM, APM, CPM) são testes psicológicos **proprietários** (Pearson Assessment) e estão **listados no SATEPSI** do CFP. Aplicação e interpretação em contextos de decisão de emprego no Brasil são **privativas de psicólogo registrado no CRP** conforme a **Resolução CFP 031/2022** (revogou a Res. 09/2018). Usar Raven em seleção sem psicólogo responsável configura:

- **Exercício ilegal da profissão** por parte de quem aplicar (crime previsto no Art. 47 da Lei de Contravenções Penais)
- **Falta ética** se aplicado por psicólogo sem aderência rigorosa ao manual SATEPSI (correção/interpretação)
- **Risco trabalhista** — candidato rejeitado pode alegar critério não técnico e gerar ação

A Beauty Smile **decidiu não contratar psicólogo CFP fixo** (decisão de negócio registrada em R-12b do master). Logo, Raven **em seleção está fora**.

### 2.2 Por que ICAR resolve

| Critério | Raven (SPM/APM) | ICAR Matrix Reasoning |
|---|---|---|
| **Status SATEPSI** | Listado (usos profissionais exigem psicólogo CFP) | **Não listado** — não é "teste psicológico" no sentido regulamentado |
| **Licença dos itens** | Proprietária (Pearson) | **Creative Commons CC-BY (paper)** + **CC0 dataset** (openpsychologydata) — uso livre, inclusive comercial, com citação |
| **Custo por aplicação** | ~ US$ 5–15/candidato + manual + treino | **Zero** |
| **Necessidade de psicólogo** | Sim (aplicação + correção + laudo) | Não — é "avaliação cognitiva" não-privativa |
| **Validade (correlação com g)** | Padrão-ouro | ICAR60 ↔ Raven's APM r=0.75 (corrigido para restrição de range) — Condon & Revelle (2014) |
| **Validade de conteúdo** | 60 itens Sets A–E | 11 itens MR (ICAR60) ou 4 itens MR (ICAR16) — estímulos equivalentes (3×3, uma célula faltando) |
| **Disponibilidade digital** | Licença Pearson (Q-interactive) | Aplicação web própria, sem API externa |

### 2.3 Enquadramento legal (parecer interno)

ICAR é descrito pelos próprios autores como **"public-domain measure"** (Condon & Revelle, 2014). O site oficial icar-project.com pede que o uso seja acadêmico-pesquisa (*"We have to turn down any commercial requests"*), mas:

1. O **paper em si** é CC-BY (Elsevier via ScienceDirect em rota open-access).
2. O **dataset no Journal of Open Psychology Data (JOPD)** é **CC0 Public Domain Dedication** — inclui itens e chaves.
3. O pacote R **`psych`** (Revelle, GPL-2) embarca a sub-amostra `ability` / `iqitems` com 4 itens MR do ICAR16 — também redistribuível.

**Posicionamento adotado:** Beauty Smile NÃO irá solicitar o banco completo no site icar-project.com (que é fechado por formulário e uso acadêmico). Vamos usar apenas os **4 itens MR publicados no Appendix A do paper** (domínio público via CC-BY do artigo) e/ou extraídos do pacote `psych` (CC0/GPL). Para completar 11 itens, **reproduziremos graficamente em SVG** com base em padrões descritos no paper — itens novos com estímulos equivalentes (algoritmo de matrix reasoning documentado na literatura: progressão por linha/coluna em forma + preenchimento + rotação). Isso nos coloca em **zona segura de licenciamento**.

> ⚠️ **Gap legal aberto:** confirmar com advogado de propriedade intelectual se a reprodução gráfica inspirada em padrões documentados é ok. **Decisão preferida:** usar **apenas os 4 itens MR do ICAR16 (MR.45, MR.46, MR.47, MR.55)** do pacote `psych` + redesenhados em SVG próprio. Ver §13 Gap #G-02.

---

## 3. O que é ICAR Matrix Reasoning

| Atributo | Valor |
|---|---|
| **Projeto** | International Cognitive Ability Resource — consórcio coordenado por David Condon e William Revelle (Northwestern University) |
| **Referência canônica** | Condon, D. M., & Revelle, W. (2014). *The international cognitive ability resource: Development and initial validation of a public-domain measure.* **Intelligence, 43, 52–64.** https://doi.org/10.1016/j.intell.2014.01.004 |
| **Site oficial** | https://icar-project.com/ |
| **Dataset público** | Condon & Revelle (2015). *Selected ICAR Data from the SAPA-Project.* **Journal of Open Psychology Data, 3(1), e1.** CC0. http://dx.doi.org/10.7910/DVN/AD9RVY |
| **Pacote R** | `psych::ability` / `psych::iqitems` (Revelle, GPL) |
| **Amostra de validação** | **N = 96.958** participantes de 199 países (SAPA-Project), 14–90 anos, coletados 2010–2013 |
| **Bateria completa (ICAR60)** | 60 itens em 4 subescalas: 9 Letter/Number Series (LN), **11 Matrix Reasoning (MR)**, 16 Verbal Reasoning (VR), 24 Three-dimensional Rotation (R3D) |
| **Confiabilidade** | α = 0.93, ω_total = 0.94 para ICAR60; α = 0.81, ω_total = 0.83 para ICAR16; **α = 0.68, ω_total = 0.71 para os 11 itens MR apenas** |
| **Validade concorrente** | ICAR60 ↔ Raven's APM r = 0.75 (corrigido para range); ↔ SAT combinado r = 0.59 (corrigido); ↔ ACT r = 0.52 (corrigido); ↔ Shipley-2 (comercial) analisado em Study 3 |
| **Correlação com g** | ICAR60 tem saturação g elevada (fator geral explica ~40% da variância); subescalas LN e VR têm as maiores cargas em g; MR é modestamente menor |

### 3.1 Formato do item Matrix Reasoning (MR)

- **Estímulo:** array 3×3 de figuras geométricas, com a célula inferior-direita em branco (formato Raven-like).
- **Tarefa:** identificar qual das **6 alternativas** visuais completa corretamente a matriz seguindo o padrão de linhas/colunas.
- **Resposta:** escolha única (radio button) entre 6 opções.
- **Sem timer por item** no protocolo original (Condon & Revelle deixaram untimed deliberadamente — §3.1.2 do paper: *"we avoided the use of 'timed' items... to provide a more stringent and conservative evaluation"*). **Decisão Beauty Smile: usaremos timer total frouxo** (ver §6.2).
- **Dificuldade (mean proportion correct)** em 11 itens MR do ICAR60 varia 0.28 (MR.50) a 0.77 (MR.43).

---

## 4. Subset escolhido: ICAR Matrix Reasoning completo (**11 itens**)

### 4.1 Alternativas consideradas

| Opção | Itens MR | Tempo | α | Uso típico | Decisão |
|---|---|---|---|---|---|
| **ICAR16** | 4 (MR.45/46/47/55) | ~15 min total (4 subescalas) | 0.81 bateria inteira / ~0.4–0.5 só MR | Screening rápido em pesquisa | Rejeitado: MR pouco confiável isolado; exige aplicar as 4 subescalas |
| **ICAR-MR11** (subset proposto) | 11 (MR.43–56) | ~12 min | α = 0.68, ω_t = 0.71 | Foco em raciocínio fluido visual | **Escolhido** |
| **ICAR60** | 60 itens | ~40 min (cansa demais) | α = 0.93 | Pesquisa rigorosa | Rejeitado: longo demais; inclui estímulos verbais em inglês (VR) |

### 4.2 Justificativa do subset ICAR-MR11 (apelido interno)

1. **Visual-puro** — não depende de vocabulário em inglês nem de conhecimento cultural (boas propriedades para dentistas de várias regiões do Brasil, alguns com menor exposição a testes padronizados).
2. **Tempo razoável** — 11 itens em ~12 min é compatível com o SLA de 7 dias e não cansa o candidato dentro do bloco `testes_async`.
3. **Confiabilidade aceitável para filtro** — α = 0.68 é abaixo do ideal clínico (0.80+), mas o uso aqui é **triagem com revisão humana**, não diagnóstico. Erro-padrão de medida é absorvido pela revisão manual no kanban.
4. **Banco de itens identificável** — todos os 11 IDs são conhecidos (MR.43, MR.44, MR.45, MR.46, MR.47, MR.48, MR.50, MR.53, MR.54, MR.55, MR.56) e têm estatísticas publicadas (página icar-project.org/types/MR/MRstats.html).
5. **Cobertura de dificuldade** — 11 itens cobrem faixa de dificuldade de 0.28 a 0.77, suficiente para discriminar dentistas juniores de coordenadores seniores.

**Versão do modelo** (campo `scores_candidato.versao_modelo`): `'cognitivo-icar-mr11-v1'`.

---

## 5. Origem dos itens e das imagens

### 5.1 Fontes consideradas (em ordem de preferência legal)

| Fonte | Licença | Itens disponíveis | Formato | Uso planejado |
|---|---|---|---|---|
| Appendix A do paper Condon & Revelle (2014) | CC-BY (via ScienceDirect open access) | ~2 itens MR de exemplo | PNG embutido em PDF | Referência visual para redesenho |
| `psych::iqitems` (CRAN) | GPL-2 | 4 itens MR do ICAR16 (.45, .46, .47, .55) | Apenas chaves de resposta, sem imagens | Validação de scoring |
| JOPD Dataverse (ICAR data 2015) | CC0 | Respostas de 96k participantes + scoring keys | CSV/RData | Normas |
| icar-project.com (cadastro + formulário) | "Academic use only" | Banco completo | Imagens baixa resolução | **Evitar** — licença ambígua para uso corporativo |
| **Redesenho próprio (SVG)** | Criado pela Beauty Smile (nosso IP) | 11 itens equivalentes a MR.43–56 | **SVG** | **Fonte principal** |

### 5.2 Decisão: redesenhar os 11 itens em SVG próprio

**Racional:**
- Evita qualquer ambiguidade de licenciamento.
- SVG escala em qualquer resolução (mobile → desktop) sem serrilhado.
- Permite embaralhamento das **alternativas** sem precisar gerar 6! = 720 variantes de bitmap.
- Permite acessibilidade futura (aria-label em pt-BR).

**Processo de produção (fora de escopo técnico deste PRD, é design):**
1. Designer estuda padrões MR documentados na literatura (progressão, adição, distribuição, XOR, rotação).
2. Para cada um dos 11 itens, reproduz um estímulo **com mesma estrutura lógica** (mesmo tipo de regra de transformação) e **dificuldade calibrada** na mesma faixa.
3. Designer entrega **11 arquivos SVG do estímulo + 66 arquivos SVG de alternativas** (6 por item).
4. Psicólogo consultor (contratação pontual, não fixo) valida que os estímulos são psicometricamente equivalentes ao banco original.

### 5.3 Armazenamento em Supabase Storage

- **Bucket:** `icar-imagens` (já previsto no master §6.5).
- **Acesso:** leitura autenticada (candidato durante o teste + RH para auditoria).
- **Estrutura de pastas:**
  ```
  icar-imagens/
  ├── v1/
  │   ├── itens/
  │   │   ├── mr43/
  │   │   │   ├── estimulo.svg
  │   │   │   ├── alt_1.svg
  │   │   │   ├── alt_2.svg
  │   │   │   ├── ...
  │   │   │   └── alt_6.svg
  │   │   ├── mr44/ ... (mesmo padrão)
  │   │   └── mr56/
  │   └── exemplo/
  │       ├── estimulo.svg
  │       └── alt_{1..6}.svg
  ```
- **Versionamento:** pasta `v1/` permite futuros redesenhos (`v2/`) sem quebrar scores antigos (campo `versao_modelo` em `scores_candidato` distingue).
- **Cache:** `Cache-Control: public, max-age=31536000, immutable` — arquivos nunca mudam dentro de uma versão.
- **Preload:** frontend faz prefetch de todos os 11 estímulos + 66 alternativas ao carregar a tela de instruções (evita latência durante timer).

---

## 6. Formato de Aplicação

### 6.1 Número de itens

- **11 itens de prova** (MR.43 até MR.56, na notação do banco original) + **1 item de exemplo** exibido nas instruções.
- Itens apresentados em **ordem aleatória por candidato** (anti-cola §11) **com restrição:** primeiro item é um dos 3 mais fáceis (MR.43, MR.46 ou MR.47) para dar confiança inicial.

### 6.2 Timer: total frouxo, sem timer por item

| Decisão | Valor | Racional |
|---|---|---|
| **Timer por item** | ❌ Não | Protocolo original é untimed; pressão por item cria ansiedade sem ganhar validade |
| **Timer total** | ✅ **15 minutos** (hard limit) | 11 itens × ~60s + 4 min buffer. Dá tempo de pensar; impede candidato ficar 2h pesquisando |
| **Aviso visível** | Sim, contagem decrescente top-right | Candidato sabe quanto falta, pode pacear |
| **Warning em 3 min restantes** | Sim, toast + mudança de cor do timer | Evita surpresa de corte |
| **Comportamento ao estourar** | Auto-submit com as respostas já dadas; itens não respondidos contam como "omitido" (não é errado, mas não é certo) | Evita perda de dados |

> **Validação server-side do timer:** o servidor guarda `scores_candidato.iniciado_em` ao primeiro GET dos itens; ao submit, valida `now() - iniciado_em <= 15 min + 30s tolerância`. Estouros geram warning mas aceitam (rede lenta). Estouros muito maiores (> 30 min) marcam `flag_tempo_suspeito=true` para o RH revisar.

### 6.3 Progresso visível

- Barra top: "Questão 5 de 11" + progresso visual.
- Contador de tempo restante ao lado.
- **Sem mostrar** percentual de acertos em tempo real (não é feedback de performance, é teste).

### 6.4 Navegação item-a-item

| Funcionalidade | Comportamento |
|---|---|
| **Avançar** | Botão "Próxima" habilitado só após selecionar alternativa |
| **Voltar** | ❌ **Não permitido** — evita reestudo. Alinhado com filosofia Raven-like |
| **Pular** | ❌ **Não permitido** — candidato precisa escolher uma das 6 para avançar (ou selecionar "Não sei" — **decisão pendente** G-05) |
| **Revisar antes de submit** | ❌ Não — submit é implícito ao responder a última questão; tela final pergunta "Tem certeza?" com countdown 5s |
| **Salvamento incremental** | ✅ **Sim** — cada resposta é persistida imediatamente em `respostas_cognitivo` via PATCH (resiliência contra queda de rede/aba fechada) |

### 6.5 Dispositivos

- **Mobile-first** (alinhado com master §4 RF-01-16 padrão mobile).
- Estímulo 3×3 renderiza em grid responsivo; em telas <375px as alternativas viram 3×2 (em vez de 6×1 linear).
- **Bloqueio de rotação?** Não — candidato pode usar portrait ou landscape.

---

## 7. Cálculo de Score

### 7.1 Score bruto

```
acertos = count(respostas_cognitivo.correto = true) WHERE candidatura_id = ?
total   = 11
```

### 7.2 Score principal (0-100) — campo `scores_candidato.score_principal`

**Algoritmo simplificado (V1, sem norma BR):**

```
proporcao_acertos = acertos / 11
score_principal   = round(proporcao_acertos * 100)  // 0, 9, 18, 27, ..., 100
```

Isso dá 12 níveis possíveis (0 acertos = 0; 11 acertos = 100). **Não é percentil em sentido psicométrico** — é apenas normalização linear para uso interno de ranking.

**Justificativa de não usar percentil na V1:**
- Não temos amostra normativa brasileira própria ainda.
- Usar percentil US (da amostra SAPA) seria inadequado culturalmente.
- Redesenho próprio dos itens invalida qualquer percentil do banco original.
- Ranking relativo entre candidatos de uma mesma vaga é suficiente para decisão RH.

### 7.3 Score JSON detalhado — campo `scores_candidato.score_json`

```json
{
  "versao_modelo": "cognitivo-icar-mr11-v1",
  "acertos": 8,
  "total": 11,
  "itens_respondidos": 11,
  "itens_omitidos": 0,
  "tempo_total_ms": 612000,
  "tempo_medio_por_item_ms": 55636,
  "flag_tempo_suspeito": false,
  "flag_rapido_demais": false,
  "detalhes_itens": [
    {"item_id": "mr43", "resposta": 3, "correto": true, "tempo_ms": 42000},
    {"item_id": "mr46", "resposta": 5, "correto": true, "tempo_ms": 38000},
    {"item_id": "mr50", "resposta": 2, "correto": false, "tempo_ms": 78000}
  ]
}
```

### 7.4 Flags de auditoria

| Flag | Regra | Efeito |
|---|---|---|
| `flag_tempo_suspeito` | `tempo_total_ms > 18 * 60 * 1000` (18 min, além da tolerância) | Badge "Tempo excedido" no perfil do candidato para RH |
| `flag_rapido_demais` | `tempo_total_ms < 2 * 60 * 1000` E `acertos >= 8` | Badge "Verificar — possível consulta externa" |
| `flag_sem_tentativa` | `itens_omitidos >= 5` | Badge "Abandonou teste" — não elimina, mas sinaliza |

### 7.5 Aplicação do threshold

```sql
-- Trigger / computed view
CASE
  WHEN s.score_principal < v.threshold_eliminatorio THEN 'abaixo_threshold'
  WHEN s.score_principal < v.threshold_eliminatorio + 10 THEN 'limítrofe'
  ELSE 'ok'
END AS status_cognitivo
```

O kanban RH pinta esses 3 estados em vermelho / amarelo / verde.

---

## 8. Modelo de Dados (SQL DDL)

### 8.1 Tabela `respostas_cognitivo`

```sql
CREATE TABLE respostas_cognitivo (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id   uuid NOT NULL REFERENCES candidaturas(id) ON DELETE CASCADE,
  item_id          text NOT NULL,                  -- 'mr43', 'mr44', ..., 'mr56'
  ordem_apresentada int NOT NULL,                  -- 1..11 (ordem aleatória real mostrada ao candidato)
  resposta         int NOT NULL CHECK (resposta BETWEEN 1 AND 6),
  alternativas_ordem int[] NOT NULL,               -- [3,1,5,2,6,4] — mapeia posição mostrada → índice original (anti-cola)
  correto          boolean NOT NULL,
  tempo_ms         int NOT NULL CHECK (tempo_ms >= 0),
  respondido_em    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (candidatura_id, item_id)
);

CREATE INDEX idx_respcognitivo_candidatura ON respostas_cognitivo(candidatura_id);

-- RLS: candidato lê as próprias (pelo join com candidaturas → candidatos.user_id)
ALTER TABLE respostas_cognitivo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "candidato_le_proprias_respostas_cognitivo" ON respostas_cognitivo
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM candidaturas c
      JOIN candidatos cd ON cd.id = c.candidato_id
      WHERE c.id = respostas_cognitivo.candidatura_id
        AND cd.user_id = auth.uid()
    )
  );

CREATE POLICY "candidato_insere_respostas_proprias" ON respostas_cognitivo
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM candidaturas c
      JOIN candidatos cd ON cd.id = c.candidato_id
      WHERE c.id = respostas_cognitivo.candidatura_id
        AND cd.user_id = auth.uid()
    )
  );

CREATE POLICY "rh_le_todas_respostas_cognitivo" ON respostas_cognitivo
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios_rh WHERE user_id = auth.uid())
  );
```

### 8.2 Uso de `scores_candidato` (já existe no master §6.2)

```sql
-- Exemplo de linha após conclusão do teste:
INSERT INTO scores_candidato (candidatura_id, tipo_teste, score_json, score_principal, versao_modelo)
VALUES (
  '<uuid-candidatura>',
  'cognitivo',
  '{"versao_modelo":"cognitivo-icar-mr11-v1","acertos":8,"total":11,...}'::jsonb,
  73,  -- round(8/11 * 100)
  'cognitivo-icar-mr11-v1'
);
```

A constraint `UNIQUE (candidatura_id, tipo_teste)` garante que só há um score de cognitivo por candidatura. Reteste só é possível via rota RH de "anular e reabrir" (fora de escopo V1).

### 8.3 Tabela opcional `icar_itens_catalogo` (seed estático)

Fonte da verdade dos itens + chaves de resposta. **Não é tabela transacional** — é um seed embarcado em migração.

```sql
CREATE TABLE icar_itens_catalogo (
  item_id              text PRIMARY KEY,              -- 'mr43', ...
  versao_modelo        text NOT NULL,                 -- 'cognitivo-icar-mr11-v1'
  resposta_correta     int NOT NULL CHECK (resposta_correta BETWEEN 1 AND 6),
  dificuldade_esperada numeric,                       -- proporção de acertos esperada (0-1)
  storage_path         text NOT NULL,                 -- 'v1/itens/mr43/'
  ativo                boolean DEFAULT true
);

-- Seed inicial (exemplo — dificuldades vêm da página icar-project.org/types/MR/MRstats.html)
INSERT INTO icar_itens_catalogo VALUES
  ('mr43', 'cognitivo-icar-mr11-v1', 0, 0.77, 'v1/itens/mr43/', true),  -- resposta correta a preencher por psicólogo consultor
  ('mr44', 'cognitivo-icar-mr11-v1', 0, 0.66, 'v1/itens/mr44/', true),
  ('mr45', 'cognitivo-icar-mr11-v1', 0, 0.52, 'v1/itens/mr45/', true),
  ('mr46', 'cognitivo-icar-mr11-v1', 0, 0.60, 'v1/itens/mr46/', true),
  ('mr47', 'cognitivo-icar-mr11-v1', 0, 0.62, 'v1/itens/mr47/', true),
  ('mr48', 'cognitivo-icar-mr11-v1', 0, 0.53, 'v1/itens/mr48/', true),
  ('mr50', 'cognitivo-icar-mr11-v1', 0, 0.28, 'v1/itens/mr50/', true),
  ('mr53', 'cognitivo-icar-mr11-v1', 0, 0.61, 'v1/itens/mr53/', true),
  ('mr54', 'cognitivo-icar-mr11-v1', 0, 0.39, 'v1/itens/mr54/', true),
  ('mr55', 'cognitivo-icar-mr11-v1', 0, 0.36, 'v1/itens/mr55/', true),
  ('mr56', 'cognitivo-icar-mr11-v1', 0, 0.40, 'v1/itens/mr56/', true);

-- RLS: leitura APENAS via Edge Function — candidato NUNCA vê resposta_correta
ALTER TABLE icar_itens_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apenas_service_role" ON icar_itens_catalogo
  FOR ALL USING (auth.role() = 'service_role');
```

**Crítico de segurança:** `resposta_correta` NUNCA é enviada ao cliente. O cálculo de `correto` acontece em **Edge Function** (Deno) — ver §11.

### 8.4 Edge Function `/submit_cognitivo`

```typescript
// supabase/functions/submit_cognitivo/index.ts
// Recebe: { candidatura_id, item_id, resposta, alternativas_ordem, tempo_ms }
// Valida: candidato autenticado é dono da candidatura
//         tempo_ms está dentro da janela
//         item não foi respondido ainda (idempotência via UNIQUE)
// Lookup: icar_itens_catalogo.resposta_correta
// Calcula: correto = (resposta == resposta_correta_depois_de_desembaralhar_via_alternativas_ordem)
// Insere:  respostas_cognitivo
// Se é a última resposta (count == 11 OU timer expirou): computa score e insere em scores_candidato
```

---

## 9. UX Detalhada

### 9.1 Fluxo de telas

```
/candidato/testes
  └─> card "Teste Cognitivo (ICAR)" — aparece se vaga_testes_aplicaveis.aplicar IN ('obrigatorio','opcional')
      └─> click "Iniciar"
         ├─> /candidato/testes/cognitivo/instrucoes     (tela 1)
         ├─> /candidato/testes/cognitivo/exemplo        (tela 2)
         ├─> /candidato/testes/cognitivo/confirmar      (tela 3)
         ├─> /candidato/testes/cognitivo/item/:n        (telas 4-14, n=1..11)
         └─> /candidato/testes/cognitivo/concluido      (tela 15)
```

### 9.2 Tela 1 — Instruções

**Copy (pt-BR):**

> # Teste Cognitivo (ICAR)
>
> Este teste avalia sua capacidade de identificar padrões visuais e raciocinar logicamente.
>
> **Como funciona:**
> - Você verá **11 questões**. Cada questão mostra uma matriz 3×3 com uma célula em branco.
> - Escolha, entre **6 opções**, a figura que completa o padrão.
> - As questões têm dificuldade variada.
> - Você tem **15 minutos** no total (há um cronômetro na tela).
>
> **Regras importantes:**
> - ❌ Não é possível voltar para questões anteriores.
> - ❌ Não é permitido consultar outras pessoas ou pesquisar na internet.
> - ✅ Você pode fazer o teste uma única vez.
> - ✅ Se sua conexão cair, suas respostas ficam salvas.
>
> [Ver exemplo →]

### 9.3 Tela 2 — Item de exemplo (com gabarito)

Mostra o item de exemplo, candidato escolhe; a tela revela a resposta correta e explica a lógica (ex: "A regra é: cada linha adiciona um triângulo"). **Este é o único feedback de resposta que o candidato recebe em todo o teste.**

### 9.4 Tela 3 — Confirmação pré-início

> **Pronto para começar?**
>
> Ao clicar em "Iniciar teste", o cronômetro de 15 minutos começa.
> Não haverá pausa.
>
> [Cancelar] [Iniciar teste]

Ao clicar, backend grava `scores_candidato.iniciado_em` = now(). É ponto de não retorno.

### 9.5 Telas 4–14 — Item-a-item

```
┌─────────────────────────────────────────────────────────┐
│ Questão 5 de 11                    ⏱ 11:23 restantes    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌───┬───┬───┐                                         │
│   │ ▲ │ ● │ ■ │                                         │
│   ├───┼───┼───┤    Qual figura completa o padrão?       │
│   │ ● │ ■ │ ▲ │                                         │
│   ├───┼───┼───┤                                         │
│   │ ■ │ ▲ │ ? │                                         │
│   └───┴───┴───┘                                         │
│                                                         │
│   Alternativas:                                         │
│   ( ) 1 ●     ( ) 2 ■     ( ) 3 ▲                       │
│   ( ) 4 ◆     ( ) 5 ★     ( ) 6 ✕                       │
│                                                         │
│                                    [ Próxima → ]        │
└─────────────────────────────────────────────────────────┘
```

- Radio buttons grandes (touch-friendly em mobile).
- Botão "Próxima" só habilitado após seleção.
- Ao clicar: PATCH `/submit_cognitivo` → se OK, navega para próxima.

### 9.6 Tela 15 — Conclusão

Mensagem neutra, sem revelar score:

> # Teste concluído
>
> Obrigado! Suas respostas foram registradas.
>
> O resultado do teste cognitivo, junto com os outros testes do processo seletivo, será analisado pelo nosso time de RH.
>
> Você receberá novidades sobre sua candidatura em breve.
>
> [Voltar para meus testes]

**Decisão consciente:** **não mostrar score ao candidato** — nem mesmo acertos/total. Protege validade (candidato não repete padrão em próximas vagas) e evita ansiedade. Alinhado com §9 do master, onde o resultado agregado aparece apenas ao RH.

> ⚠️ **Gap G-06:** LGPD Art. 9º dá direito ao titular de acesso aos dados tratados. Candidato pode solicitar via canal próprio e ser enviado relatório simples — mas no flow automático não mostramos. Confirmar com jurídico.

### 9.7 Estados de erro

| Cenário | Comportamento |
|---|---|
| Rede cai durante item | Resposta salva localmente (localStorage); ao reconectar, faz POST em background; usuário continua |
| Candidato fecha aba antes de submeter um item | Ao reabrir, volta exatamente no item onde parou; timer restante é recalculado do servidor |
| Timer server estourou mas cliente ainda mostra tempo | Próximo PATCH retorna 403 com código `TIMER_EXPIRED`; frontend navega para tela final |
| Candidato já completou o teste antes | Rota bloqueada, mensagem: "Você já realizou este teste." |
| Vaga não tem ICAR habilitado | Card nem aparece em `/candidato/testes` |

---

## 10. Integração com perfil ideal da vaga

### 10.1 Configuração por vaga (tela RH)

Tela `/rh/vagas/:id/configurar-testes` (já prevista em RF-33a/b do master).

```
┌─── ICAR (Cognitivo) ──────────────────────────────────┐
│                                                        │
│   Aplicar: ( ) Não aplicar                             │
│            (●) Obrigatório                             │
│            ( ) Opcional                                │
│                                                        │
│   Peso no score agregado: [40]   0 ←──●──→ 100        │
│                                                        │
│   Threshold eliminatório (0-100): [50]                 │
│   ℹ Candidatos abaixo receberão badge vermelho        │
│                                                        │
│   Templates sugeridos por cargo:                       │
│   • Dentista Júnior ........... threshold 40, peso 30 │
│   • Dentista Sênior ........... threshold 50, peso 40 │
│   • Coordenador Regional ...... threshold 55, peso 50 │
│   • Gestor de Clínica ......... threshold 60, peso 60 │
│   • Recepcionista ............. não aplicar           │
│                                                        │
└────────────────────────────────────────────────────────┘
```

Os templates são armazenados em `templates_perfil_vaga` (master §6.2).

### 10.2 Thresholds recomendados (V1, a ajustar com dados)

| Cargo | Threshold mínimo | Peso no score | Justificativa |
|---|---|---|---|
| Recepcionista | — (não aplicar) | 0 | Demanda cognitiva baixa; avaliação por DISC + Big Five |
| Auxiliar de saúde bucal | — (opcional) | 10 | Recomendável mas não eliminatório |
| Dentista júnior | 40 | 30 | ~4 acertos em 11 — filtra casos muito baixos |
| Dentista sênior | 50 | 40 | ~5–6 acertos |
| Coordenador regional | 55 | 50 | Supervisão exige raciocínio analítico |
| Gestor de clínica | 60 | 60 | Decisão estratégica |
| Analista financeiro/contábil | 60 | 60 | Igual gestor |

> ⚠️ **Calibração empírica necessária** — nos primeiros 3 meses de uso, coletar distribuição de scores entre candidatos contratados que performaram bem em 90 dias. Ajustar thresholds em V2 com base em evidência real. Gap G-07.

### 10.3 Visualização no kanban RH

**Card do candidato no kanban (etapa `testes_async`):**

```
┌─ João Silva — Dentista Sênior ──────────┐
│ 🧠 Big Five ...... 72  ✓                │
│ 🎯 DISC .......... C/D                  │
│ 🧩 Cognitivo .....  45  🔴 abaixo 50    │ ← badge vermelho
│ 🎨 Cultural ...... 68  ✓                │
│ ────────────────────                    │
│ Score agregado: 60                      │
│ [ Revisar ]                             │
└─────────────────────────────────────────┘
```

**Perfil detalhado do candidato (RH vê):**

- Score: 45/100 (5 de 11 acertos)
- Tempo total: 12 min 15s
- Flags: nenhuma
- **Gráfico de barras por item** mostrando quais itens acertou / errou (dificuldade esperada vs performance real)
- Badge de recomendação automática: "Score abaixo do threshold configurado (50) para esta vaga. Revisar antes de rejeitar."

---

## 11. Anti-cola e Segurança

### 11.1 Anti-cola (client-side, esforço razoável)

| Medida | Descrição | Limitação |
|---|---|---|
| **Randomização da ordem dos 11 itens** | `seed = hash(candidatura_id)` → ordem determinística mas única por candidato | Não evita quem filma a tela |
| **Randomização da ordem das 6 alternativas** | Array `alternativas_ordem` armazenado em `respostas_cognitivo` | Impede memorização de "resposta é a opção 4" |
| **Desabilitar copy/paste e context menu** | `onCopy={e=>e.preventDefault()}` + `onContextMenu={e=>e.preventDefault()}` | Atalho teclado ainda funciona; mais uma fricção do que bloqueio |
| **Detecção de perda de foco** | `document.visibilitychange` — se candidato sai da aba, registra evento em `scores_candidato.score_json.eventos_foco` | Não impede; apenas loga |
| **Watermark sutil com CPF do candidato** | Overlay translúcido com CPF parcial no fundo da tela | Desencoraja print e redistribuição |
| **Bloqueio de inspect?** | Não bloqueamos — é trivial de contornar e atrapalha debugging legítimo | — |
| **Detecção de devtools abertos** | Não recomendado — quebra UX e é inútil | — |

### 11.2 Anti-cola (server-side, autoridade)

| Medida | Descrição | Força |
|---|---|---|
| **Resposta correta NUNCA no frontend** | `icar_itens_catalogo.resposta_correta` só acessível via Edge Function; payload ao cliente tem apenas `item_id` + URLs das imagens | Forte — impede que o gabarito vaze |
| **Validação server-side do timer** | Edge Function rejeita submits após `iniciado_em + 15 min + 30s tolerância`; flag_tempo_suspeito gerado | Forte |
| **Rate limit por candidato** | Max 1 teste por candidatura (constraint UNIQUE em `scores_candidato`); tentativas repetidas → 409 | Forte |
| **Validação de ordem de chegada** | Edge Function valida que `ordem_apresentada` é a que o servidor sorteou para aquele `candidatura_id` (evita brute-force reordenando) | Forte |
| **Assinatura da sessão** | Token JWT com claim `cognitivo_sessao_id` criado ao iniciar; verificado em cada submit | Forte |

### 11.3 Detecção passiva de trapaça (flags para RH)

Armazenadas em `scores_candidato.score_json`:

```json
{
  "flag_rapido_demais": true,      // < 2min total, 8+ acertos
  "flag_tempo_suspeito": false,
  "flag_mudou_aba": true,          // visibility changed > 3 vezes
  "flag_score_incoerente": false,  // acerta itens difíceis (MR.50) e erra fáceis (MR.43)
  "eventos_foco": [
    {"tipo":"blur","em":"2026-04-19T15:23:05Z"},
    {"tipo":"focus","em":"2026-04-19T15:23:42Z"}
  ]
}
```

RH vê badges no perfil do candidato; decide se conversa/reaplica/ignora.

### 11.4 O que **não** tentamos impedir (decisão explícita)

- **Câmera apontada para a tela** — exigir webcam com monitoramento é invasivo e desproporcional para cargos não-críticos.
- **Consulta por WhatsApp a um amigo** — impossível de detectar sem proctoring, que custaria caro.
- **Uso de IA (ChatGPT, Gemini) para resolver matriz via screenshot** — real e crescente; mitigação é redesenhar itens periodicamente (bump para `v2`) e calibrar thresholds. Gap G-04.

---

## 12. LGPD

### 12.1 Base legal

- **Execução de contrato** (Art. 7º, V) — teste é parte do processo seletivo ao qual o candidato se candidatou livremente.
- **Consentimento específico** (Art. 7º, I + Art. 11 para dado sensível) — opcional para nós, mas adicionamos checkbox ao iniciar:

> ☐ Concordo com o tratamento dos meus dados pessoais e das minhas respostas ao teste cognitivo, para fins exclusivos de avaliação para a vaga [Dentista Sênior - Filial X]. Meus dados serão mantidos por até 24 meses e posso solicitar a exclusão antes via [link].

### 12.2 Dados coletados

| Dado | Categoria | Retenção |
|---|---|---|
| Respostas por item (1-6) | Pessoal | 24 meses ou até exclusão via Art. 18 |
| Tempo por item | Pessoal | 24 meses |
| Score agregado | Pessoal (pode virar sensível dependendo da interpretação — ver §12.4) | 24 meses |
| IP de origem | Pessoal | 90 dias (log de auditoria) |
| Eventos de foco da aba | Metadado | 24 meses |

### 12.3 Direitos do titular (Art. 18)

| Direito | Implementação |
|---|---|
| **Acesso** | Rota `/candidato/meus-dados` mostra resumo do score (não detalhe item-a-item para evitar vazamento de gabarito) |
| **Correção** | N/A (teste não é "corrigível" — é medição) |
| **Exclusão** | Rota `/candidato/excluir-conta` apaga `respostas_cognitivo` + `scores_candidato` em CASCADE |
| **Portabilidade** | JSON export disponível em `/candidato/meus-dados/exportar` |
| **Revisão de decisão automatizada (Art. 20)** | **Garantida** — badge vermelho no kanban RH pede revisão humana obrigatória antes de rejeição. Candidato rejeitado pode solicitar revisão via canal próprio |
| **Informação sobre uso de scores** | Política de privacidade explica: "seu desempenho no teste cognitivo é um dos vários fatores analisados por nosso time de RH" |

### 12.4 Enquadramento como dado sensível?

**Avaliação cognitiva** não é explicitamente listada no Art. 5º, II da LGPD como "dado sensível" (ao contrário de saúde, orientação sexual, etc.). Porém:

- Pode ser interpretada como **dado sobre origem étnica** (indiretamente, via performance em testes de raciocínio) — existe literatura sobre viés cultural.
- Para evitar qualquer risco, **tratamos como dado sensível em retenção e acesso** (criptografia em repouso, acesso restrito por RLS).

Gap G-08: confirmar enquadramento com DPO / advogado LGPD interno.

---

## 13. Gaps e Decisões Pendentes

| ID | Gap | Prioridade | Resolvedor | Deadline |
|---|---|---|---|---|
| **G-01** | Contratar psicólogo consultor pontual para: (a) validar equivalência psicométrica dos 11 itens redesenhados vs banco original; (b) definir chaves de resposta dos itens redesenhados; (c) assinar documento afirmando que o instrumento utilizado não configura teste psicológico privativo. | **Bloqueador** | Fernando + RH Beauty Smile | Antes da Fase 9.5 |
| **G-02** | Parecer jurídico PI: redesenho próprio de itens inspirados em padrões documentados é seguro? Alternativa: licenciar formalmente com equipe ICAR via admin@icar-project.com. | Alto | Advogado PI | Antes do design dos SVGs |
| **G-03** | Auditar licença das 60 imagens em `src/assets/images/raven/*.webp` — script `copiar-imagens-raven.sh` indica origem `/Users/fernando/Downloads/Vendas/Transcricao/Teste/images2`, o que é **suspeito**. Provavelmente Raven Pearson. **Ação:** remover do repo antes do ship do ICAR (não devem ser referenciadas no código de seleção); se forem usadas em onboarding pós-contratação, licenciar formalmente via Pearson ou substituir. | **Crítico (legal)** | Fernando | Antes do merge da Fase 9.3 |
| **G-04** | IA multimodal (ChatGPT-4V, Gemini) resolve MR via screenshot — como mitigar sem virar proctoring invasivo? Opções: (a) redesenhar itens a cada 6 meses (bumping `v2`, `v3`); (b) randomizar dinamicamente cores dos estímulos; (c) exigir webcam opcional. **Decisão V1:** aceitar o risco, monitorar flags. Revisar em 6 meses. | Médio | Fernando | V2 |
| **G-05** | Permitir opção "Não sei" como 7ª alternativa explícita? Reduz chute mas adiciona decisão de design psicométrico. **Recomendação:** sim, adicionar — "Não sei" conta como omitido (não errado), evita chute cego. | Médio | Psicólogo consultor | Antes do design das telas |
| **G-06** | Candidato tem direito LGPD de saber seu desempenho? Se sim, mostrar apenas score agregado (50/100) ou detalhe item-a-item? **Recomendação:** score agregado sob demanda via canal RH, não automático. | Médio | DPO / Jurídico | Antes do ship |
| **G-07** | Thresholds por cargo (tabela §10.2) são chute educado. Coletar distribuição real nos primeiros 3 meses e recalibrar. | Baixo (V2) | Analista People | Q2 2026 |
| **G-08** | Score cognitivo é dado sensível pela LGPD? Tratamento preventivo: sim. Confirmar. | Baixo | DPO | Antes do ship |
| **G-09** | Norma de comparação: (a) norma internacional SAPA 2010–13 (inadequada culturalmente); (b) norma BR própria (demora meses a coletar); (c) não usar percentil na V1 (adotado). Em V2, considerar construir norma interna com N≥500 candidatos BS. | Baixo (V2) | Analista People | V2 |
| **G-10** | Candidatos com deficiência visual: a11y do SVG permite screen reader descrever padrões? Literatura ICAR não trata. **Decisão V1:** marcar teste como "não aplicável" para candidatos que declarem deficiência visual severa; oferecer processo alternativo manual. | Médio | Acessibilidade | Antes do ship |
| **G-11** | Versão mobile: matriz 3×3 em tela <375px fica legível? Necessário protótipo Figma + teste de usabilidade com 5 candidatos reais. | Médio | Design | Antes da Fase 9.5 |
| **G-12** | Edge Function `/submit_cognitivo` — implementar em Deno + Supabase Functions, ou em API Route? Master §7 prefere Edge Functions Deno. Seguir convenção. | Baixo | Backend | Durante build |

---

## 14. Referências Bibliográficas

### 14.1 Fontes primárias

1. **Condon, D. M., & Revelle, W. (2014).** The International Cognitive Ability Resource: Development and initial validation of a public-domain measure. *Intelligence, 43, 52–64.* https://doi.org/10.1016/j.intell.2014.01.004 · PDF: https://www.personality-project.org/revelle/publications/condon.icar.14.pdf

2. **Condon, D. M., & Revelle, W. (2015).** Selected ICAR Data from the SAPA-Project: Development and Initial Validation of a Public-Domain Measure. *Journal of Open Psychology Data, 3(1), e1.* http://doi.org/10.5334/jopd.ae · Dataset (CC0): http://dx.doi.org/10.7910/DVN/AD9RVY

3. **Revelle, W. (2023).** *psych: Procedures for Psychological, Psychometric, and Personality Research.* R package (GPL). https://cran.r-project.org/package=psych · Datasets relevantes: `ability`, `iqitems`.

### 14.2 Sites oficiais

- **Site do projeto ICAR:** https://icar-project.com/
- **Estatísticas Matrix Reasoning:** https://icar-project.org/types/MR/MRstats.html
- **Catálogo ICAR v1.0:** https://icar-project.com/ICAR_Catalogue.pdf
- **Guidelines:** https://icar-project.com/attachments/download/138/Guidelines.pdf
- **Personality-Project (Revelle):** https://www.personality-project.org/

### 14.3 Regulação brasileira

- **Resolução CFP nº 31/2022** — Diretrizes para avaliação psicológica e regulamentação do SATEPSI. https://satepsi.cfp.org.br/legislacao.cfm · Revoga Res. CFP 09/2018.
- **SATEPSI** — Sistema de Avaliação de Testes Psicológicos. https://satepsi.cfp.org.br/
- **Nota Técnica CFP sobre uso de testes por não-psicólogos** (CRP-19). https://crp19.org.br/orientacoes-quanto-a-impossibilidade-de-uso-de-instrumentos-privativos-da-o-psicologa-o-por-outras-categorias-profissionais/
- **Lei Geral de Proteção de Dados (Lei 13.709/2018)** — Art. 7º, 9º, 18, 20.

### 14.4 Validação secundária (literatura de apoio)

- **Young, S. R., & Keith, T. Z. (2020).** An Examination of the Convergent Validity of the ICAR16 and WAIS-IV. *Journal of Psychoeducational Assessment.* DOI: 10.1177/0734282920943455
- **Kirkegaard, E. O. W., & Nordbjerg, O. (2015).** Validation of a Danish translation of the ICAR. *Mankind Quarterly.*
- **Validation of International Cognitive Ability Resource (ICAR) Implemented in Mobile Toolbox (MTB) — Intelligence 13(12), 154 (2025).** https://www.mdpi.com/2079-3200/13/12/154 · PMC: https://pmc.ncbi.nlm.nih.gov/articles/PMC12733510/
- **Ch-ICAR** (versão infantil validada 2024). *Behavior Research Methods.* https://link.springer.com/article/10.3758/s13428-024-02591-1
- **MaRs-IB** — banco alternativo open-access de matrizes para adolescentes/adultos. *Royal Society Open Science, 2019.* https://royalsocietypublishing.org/doi/10.1098/rsos.190232

### 14.5 Paper original visto internamente (como referência)

- `docs/prds/0009-prd-teste-raven.md` — PRD antigo do Raven (ser reposicionado para onboarding, conforme mini-PRD `raven-onboarding-prd.md`). Este PRD de ICAR o **substitui em etapa de seleção**.

---

## Anexos

### Anexo A — Mapeamento do enum `etapa_processo` (referência do master §6.3)

ICAR Matrix Reasoning roda dentro de `etapa_processo = 'testes_async'` junto com Big Five, DISC e Cultura, executados em paralelo conforme `vaga_testes_aplicaveis.aplicar`.

### Anexo B — Checklist de ship

- [ ] G-01 (psicólogo consultor) resolvido com assinatura
- [ ] G-02 (parecer PI) emitido
- [ ] G-03 (auditoria imagens Raven legadas) concluída — imagens removidas ou licenciadas
- [ ] 11 SVGs estímulo + 66 SVGs alternativas + 1 SVG exemplo entregues pelo designer
- [ ] Migration Supabase criada: `respostas_cognitivo` + `icar_itens_catalogo` + RLS
- [ ] Edge Function `/submit_cognitivo` implementada e testada
- [ ] Seed `icar_itens_catalogo` aplicado em staging com chaves validadas
- [ ] Bucket `icar-imagens/v1/` populado com SVGs
- [ ] Testes E2E Playwright cobrindo: fluxo feliz, timer expirado, refresh da aba, submit duplicado, RLS de candidato, anti-cola (alternativas_ordem)
- [ ] UI revisada para mobile (<375px) e acessibilidade (aria-label nos SVGs)
- [ ] Política de privacidade atualizada com menção ao ICAR
- [ ] Treinamento RH para interpretação dos scores + template de "motivo de rejeição cognitiva"
- [ ] Documentação técnica em Notion para squad de RH

### Anexo C — Estrutura final de diretórios sugerida

```
src/features/testes/cognitivo-icar/
├── components/
│   ├── ICARInstrucoes.tsx
│   ├── ICARExemplo.tsx
│   ├── ICARItem.tsx                     # renderiza 3x3 + 6 alternativas
│   ├── ICARTimer.tsx
│   ├── ICARConclusao.tsx
│   └── ICARRevisaoRH.tsx                # só RH: gráfico item-a-item
├── hooks/
│   ├── useICARSessao.ts                 # TanStack Query: iniciar/obter sessão
│   ├── useICARSubmit.ts                 # mutation item-a-item
│   └── useICARPreload.ts                # preload de SVGs
├── services/
│   ├── icarService.ts                   # fetches + edge function client
│   └── icarOrdem.ts                     # seed determinístico de randomização
├── schemas/
│   └── icarRespostaSchema.ts            # Zod
└── routes.ts

supabase/
├── migrations/
│   ├── 202604xx_create_icar_itens_catalogo.sql
│   ├── 202604xx_create_respostas_cognitivo.sql
│   └── 202604xx_seed_icar_itens_v1.sql
└── functions/
    └── submit_cognitivo/
        └── index.ts
```

---

**Fim do mini-PRD. Próxima revisão após resolução dos gaps G-01, G-02 e G-03 (bloqueadores).**
