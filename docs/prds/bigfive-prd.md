> ## ⚠️ DEPRECATED — substituído desde 2026-04-28
>
> Este PRD foi **substituído** pelo mini-PRD revisado para o M2 (Funil RH):
> **[`m2-funil-rh/PRD-bigfive-revisado.md`](./m2-funil-rh/PRD-bigfive-revisado.md)**.
>
> O PRD novo consume os 4 deep researches do M2, o curso NotebookLM Big Five do Fernando, o report BFAS validado, os 5 Word docs interpretativos, e os 25 templates oficiais de devolutiva curados. Decisões-chave que mudaram em relação a este documento legado:
>
> - **Papel do Big Five:** mudou de "filtro eliminatório (com revisão humana)" → **CONTEXTUAL não-eliminatório** (gestor recebe como informação contextual; score nunca é motivo único de rejeição). Alinhado com posicionamento CFP/SATEPSI defensável.
> - **Devolutiva:** detalhada com formato D-lite BFAS-flavored (5 dim + percentil cru + banda em 5 níveis + texto rico ~150-200 palavras por dim + analogia "1 em 100 pessoas" + disclaimer emocional + disclaimer LGPD/CFP).
> - **Posicionamento legal:** "self-assessment de estilo de trabalho" + psicólogo CRP responsável técnico já contratado.
> - **Schema:** agnóstico de instrumento (`scores_candidato.metadata.instrumento`) permite Plan B BFI-2 PT-BR (Pires 2023) com pivot 1-2 dias.
> - **UX:** 1 item por tela mobile-first + autosave + back nos últimos 3-5 itens + disclaimer pré-aplicação curado.
>
> **Mantido aqui apenas como referência histórica.** Não consultar pra implementação.

---

# Mini-PRD: Teste Big Five (IPIP-NEO-120) — DEPRECATED

**Autor:** Fernando Costa · **Data:** 2026-04-19 · **Status:** ⚠️ DEPRECATED desde 2026-04-28 (ver aviso acima)
**Upstream:** [`PRD-MASTER-sistema-recrutamento.md` §10.1](./PRD-MASTER-sistema-recrutamento.md)
**Placeholder substituído:** este documento substitui o placeholder §10.1 do PRD Mestre e deve ser lido **antes** da Fase 9.1 de implementação.
**Escopo:** implementação do teste Big Five como filtro eliminatório (com revisão humana) no funil `testes_async` do Sistema de Recrutamento Beauty Smile.

---

## Sumário

1. [Papel no Sistema](#1-papel-no-sistema)
2. [O que é Big Five / OCEAN](#2-o-que-é-big-five--ocean)
3. [Por que IPIP-NEO (vs NEO-PI-R comercial)](#3-por-que-ipip-neo-vs-neo-pi-r-comercial)
4. [Licenciamento e Status SATEPSI](#4-licenciamento-e-status-satepsi)
5. [Itens em pt-BR](#5-itens-em-pt-br--traduções-existentes--gaps)
6. [Formato de Aplicação](#6-formato-de-aplicação)
7. [Cálculo de Score](#7-cálculo-de-score)
8. [Normas de Comparação](#8-normas-de-comparação)
9. [Modelo de Dados (SQL DDL)](#9-modelo-de-dados-sql-ddl)
10. [UX Detalhada](#10-ux-detalhada)
11. [Integração com Perfil Ideal da Vaga](#11-integração-com-perfil-ideal-da-vaga)
12. [LGPD](#12-lgpd)
13. [Gaps e Decisões Pendentes](#13-gaps-e-decisões-pendentes)
14. [Referências Bibliográficas](#14-referências-bibliográficas)

---

## 1. Papel no Sistema

Referência: **PRD-MASTER §10.1** + §9 (pipeline `testes_async`) + §6.2 (tabela `vaga_testes_aplicaveis`).

- **Classificação:** Filtro **eliminatório** de personalidade (com revisão humana obrigatória antes de qualquer rejeição automática — RNF-07a).
- **Etapa no funil:** `testes_async` (roda em paralelo com DISC, ICAR, Cultural; ordem escolhida pelo candidato).
- **Quando aplicar:** após `triagem + aprovado_proxima`; antes de `entrevista`.
- **SLA:** 7 dias corridos para o candidato concluir todos os testes `testes_async`.
- **Configurabilidade por vaga:** RH marca Big Five como `obrigatorio` / `opcional` / `nao_aplicar` por vaga. Se `obrigatorio`, preenchimento é condição para avançar.
- **Efeito de reprovação:** sinaliza **badge vermelho** no kanban RH mas não move candidato; decisão de rejeitar é manual (humano lê, eventualmente acolhe, e só então rejeita).

**Hipótese de valor (testar após V3):**
- IPIP-NEO prediz performance e retenção em cargos clínicos/administrativos. Literatura mostra Conscienciosidade como melhor preditor geral (Barrick & Mount, 1991; meta-análises subsequentes).
- Para Beauty Smile a expectativa é:
  - **Dentista:** Conscienciosidade alta + Amabilidade média-alta + Neuroticismo baixo-médio.
  - **Recepcionista:** Extroversão alta + Amabilidade alta + Conscienciosidade média-alta.
  - **Coordenador de clínica:** Conscienciosidade alta + Extroversão média-alta + Neuroticismo baixo.
  - **Auxiliar:** Amabilidade alta + Conscienciosidade média.

Perfis ideais são calibrados por cargo **pelo RH ao criar a vaga** (em `vaga_testes_aplicaveis.faixa_ideal_json`).

---

## 2. O que é Big Five / OCEAN

Modelo dos **Cinco Grandes Fatores** de personalidade (Costa & McCrae, 1992; Goldberg, 1999):

| Letra | Domínio (EN) | Domínio (pt-BR) | Descrição curta |
|---|---|---|---|
| O | Openness | **Abertura a Experiências** | Curiosidade intelectual, imaginação, receptividade ao novo |
| C | Conscientiousness | **Conscienciosidade** | Organização, autodisciplina, orientação a metas |
| E | Extraversion | **Extroversão** | Sociabilidade, energia, afetividade positiva |
| A | Agreeableness | **Amabilidade** (ou Socialização) | Cooperação, confiança, empatia |
| N | Neuroticism | **Neuroticismo** (ou Instabilidade Emocional) | Propensão a emoções negativas, ansiedade, vulnerabilidade |

Cada domínio é subdividido em **6 facets** (sub-traços) — total **30 facets**. Esse é o diferencial do IPIP-NEO frente a inventários mais curtos (BFI, TIPI, Mini-IPIP).

### 2.1 Os 30 facets do IPIP-NEO-120

| Domínio | Facet code | Facet (EN) | Facet (pt-BR — sugestão) |
|---|---|---|---|
| **N — Neuroticismo** | N1 | Anxiety | Ansiedade |
|  | N2 | Anger | Irritabilidade |
|  | N3 | Depression | Depressão |
|  | N4 | Self-Consciousness | Autoconsciência / Timidez |
|  | N5 | Immoderation | Imoderação / Impulsividade |
|  | N6 | Vulnerability | Vulnerabilidade |
| **E — Extroversão** | E1 | Friendliness | Cordialidade |
|  | E2 | Gregariousness | Sociabilidade |
|  | E3 | Assertiveness | Assertividade |
|  | E4 | Activity Level | Nível de Atividade |
|  | E5 | Excitement-Seeking | Busca de Excitação |
|  | E6 | Cheerfulness | Alegria |
| **O — Abertura** | O1 | Imagination | Imaginação |
|  | O2 | Artistic Interests | Interesses Artísticos |
|  | O3 | Emotionality | Emocionalidade |
|  | O4 | Adventurousness | Espírito de Aventura |
|  | O5 | Intellect | Intelecto |
|  | O6 | Liberalism | Liberalismo |
| **A — Amabilidade** | A1 | Trust | Confiança |
|  | A2 | Morality | Moralidade / Franqueza |
|  | A3 | Altruism | Altruísmo |
|  | A4 | Cooperation | Cooperação |
|  | A5 | Modesty | Modéstia |
|  | A6 | Sympathy | Empatia |
| **C — Conscienciosidade** | C1 | Self-Efficacy | Autoeficácia |
|  | C2 | Orderliness | Organização |
|  | C3 | Dutifulness | Senso de Dever |
|  | C4 | Achievement-Striving | Busca de Realização |
|  | C5 | Self-Discipline | Autodisciplina |
|  | C6 | Cautiousness | Cautela / Prudência |

**Exposição no sistema:** V3 mostra apenas os **5 domínios** no perfil do candidato (para RH e candidato). Facets ficam no `score_json` para análise futura e alimentam scores agregados via n8n (PRD-0011). Facets podem aparecer em relatório expandido gerado sob demanda pelo RH.

---

## 3. Por que IPIP-NEO (vs NEO-PI-R comercial)

| Critério | NEO-PI-R (Costa & McCrae / PAR Inc.) | IPIP-NEO-120 (Johnson, 2014) |
|---|---|---|
| Licença | Comercial, proprietária, pago por aplicação | **Domínio público** (ipip.ori.org) — uso comercial livre |
| Está em SATEPSI? | Sim (versão BR publicada pela Vetor) → exige psicólogo CFP | **Não** → não se enquadra como "teste psicológico regulamentado" |
| Nº itens | 240 | 120 (short) / 300 (full) |
| Tempo | 35-45 min | 15-25 min |
| Domínios | 5 (mesmo modelo) | 5 (mesmo modelo) |
| Facets | 30 | 30 (correspondência 1:1 com NEO-PI-R) |
| Correlação com NEO-PI-R | — | r ≈ 0.73-0.85 por domínio (Johnson, 2014) |
| Tradução pt-BR | Sim (versão oficial Vetor, paga) | Sim, comunitária (ver §5) |
| Fit para uso em recrutamento não-clínico | Bloqueado pela decisão do cliente de não contratar psicólogo CFP | **Sim** — instrumento de avaliação, não teste psicológico regulamentado |

**Decisão:** adotar **IPIP-NEO-120** (Johnson, 2014) como instrumento Big Five da Beauty Smile. Caso no futuro a empresa contrate psicólogo CFP, pode-se migrar para BFP (Nunes, Hutz & Nunes — SATEPSI) ou NEO-PI-R sem impacto no modelo de dados (basta mudar `versao_modelo` em `scores_candidato`).

---

## 4. Licenciamento e Status SATEPSI

### 4.1 IPIP (banco de itens)
- Mantido por Lewis R. Goldberg / Oregon Research Institute (ipip.ori.org).
- Declaração oficial: *"one can copy, edit, translate, or use them for any purpose without asking permission and without paying a fee"*.
- **Domínio público** para uso comercial, acadêmico ou clínico. Sem royalties.
- Citação recomendada: Goldberg, L. R. (1999) + Johnson (2014) para a versão -120.

### 4.2 IPIP-NEO-120 (instrumento)
- Johnson, J. A. (2014). *Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory*. Journal of Research in Personality, 51, 78-89.
- Desenvolvido a partir de amostra internet N=619.150.
- α de Cronbach dos domínios: .80-.87; facets: .63-.88 (Kajonius & Johnson, 2019; Maples-Keller et al., 2019 replicou).

### 4.3 SATEPSI
- SATEPSI (Sistema de Avaliação de Testes Psicológicos do CFP) é o sistema brasileiro que lista **testes psicológicos regulamentados**.
- Base legal atual: **Resolução CFP nº 31/2022** (revogou 09/2018, que por sua vez revogou 002/2003).
- IPIP-NEO-120 **NÃO consta** na lista SATEPSI (consulta manual em satepsi.cfp.org.br em 2026-04).
- Na lista SATEPSI estão:
  - **NEO-PI-R** (versão Vetor) — sim, regulamentado.
  - **BFP — Bateria Fatorial de Personalidade** (Nunes, Hutz & Nunes) — sim, regulamentado.
  - **IPIP / IPIP-NEO / Big Five Markers** — **não**, não regulamentado.

### 4.4 Implicação legal (avaliada pelo cliente)
- Em §12 do PRD Mestre, risco **R-12b** registra a decisão informada de não contratar psicólogo CFP.
- Instrumentos não-SATEPSI são permitidos em contexto de RH como *"instrumentos de avaliação comportamental"*, **desde que não sejam apresentados como "teste psicológico"** (Resolução CFP 31/2022, art. 3º — reserva "teste psicológico" para uso exclusivo de psicólogos).
- Linguagem oficial a usar no produto:
  - ✅ "Avaliação de perfil comportamental Big Five"
  - ✅ "Inventário de personalidade IPIP-NEO (domínio público)"
  - ❌ "Teste psicológico"
  - ❌ "Avaliação psicológica"
- Relatórios não devem ter assinatura de psicólogo nem fazer diagnóstico clínico.

---

## 5. Itens em pt-BR — Traduções Existentes + Gaps

### 5.1 Opções de banco em pt-BR

| Fonte | Nº itens | Cobertura facets | Licença | Qualidade | Recomendação |
|---|---|---|---|---|---|
| **Alheimsins GitHub (`b5-johnson-120-ipip-neo-pi-r`)** | 120 (match 1:1 com Johnson 2014) | 30 facets completos | **MIT** | Tradução comunitária pt-BR, não validada academicamente | **Adotar como ponto de partida V3** |
| **Bateria Fatorial de Personalidade (BFP)** — Nunes, Hutz & Nunes | 126 | 18 subescalas (≠ 30 facets de Johnson) | Comercial (Vetor/Hogrefe) | Validado SATEPSI, normas BR | Referência teórica / item se não usar IPIP |
| **Mini-IPIP pt-BR** (Laros et al. / versão Oliveira 2019) | 20 | 5 domínios sem facets | Uso acadêmico | Validado portugueses/brasileiros | **Backup curto** se IPIP-NEO-120 longo demais |
| **Brockveld (Brasil)** — "100-item IPIP Big-Five Factor Markers" pt-BR | 100 | 5 domínios (sem facets NEO) | Uso acadêmico (contato direto) | Validada em amostra clínica brasileira | Não usada — itens são "markers" curtos, não IPIP-NEO |
| **Pontarolo (UFRGS)** — 50-item Big-Five pt-BR | 50 | 5 domínios (sem facets) | Uso acadêmico | Tese doutorado UFRGS | Não usada |

### 5.2 Decisão recomendada

Para V3 (MVP):
1. **Importar** os 120 itens do repo `Alheimsins/b5-johnson-120-ipip-neo-pi-r` (pasta `data/pt-br`) — MIT license permite uso comercial.
2. **Revisão linguística** por psicólogo consultor (1-2 dias de trabalho) para ajustar itens que pareçam estranhos em português brasileiro de contexto odontológico. Manter fidelidade semântica ao item original EN.
3. **Pilot test** com 20-30 colaboradores BS atuais para detectar itens confusos antes do go-live (calibração interna + linguagem).
4. **Congelar versão** como `ipip-neo-120-ptbr-bs-v1` em `scores_candidato.versao_modelo`.

### 5.3 Exemplo de estrutura de item (do repo Alheimsins)

```json
{
  "id": "43c98ce8-a07a-4dc2-80f6-c1b2a2485f06",
  "text": "Me preocupo com as coisas",
  "keyed": "plus",
  "domain": "N",
  "facet": 1
}
```

Cada domínio tem 24 itens (6 facets × 4 itens/facet). Campo `keyed` indica:
- `"plus"` → item alinhado positivamente com o traço (score direto 1-5).
- `"minus"` → item reverso (score invertido 5-1).

### 5.4 Escala Likert em pt-BR (já no repo, MIT)

**Para itens `plus`:**
| Resposta | Score |
|---|---|
| Discordo totalmente | 1 |
| Discordo parcialmente | 2 |
| Nem discordo, nem concordo | 3 |
| Concordo parcialmente | 4 |
| Concordo totalmente | 5 |

**Para itens `minus`:** scores invertidos (1↔5, 2↔4, 3=3).

> **Nota linguística:** A literatura original usa "Very Inaccurate → Very Accurate". A tradução pt-BR comunitária adotou "Discordo totalmente → Concordo totalmente", que é mais natural e é o padrão da BFP. Manter essa escolha.

---

## 6. Formato de Aplicação

| Item | Spec |
|---|---|
| Nº de itens | **120** (fixo) |
| Escala | **Likert 5 pontos** (Discordo totalmente → Concordo totalmente) |
| Tempo médio | **15-20 min** (média IPIP-NEO-120 em literatura; pilot BS deve confirmar) |
| Timer | **Sem timer rígido** — Big Five não é teste cronometrado. Mostrar tempo decorrido discretamente. |
| Paginação | **20 itens por página** → 6 páginas |
| Ordem dos itens | **Randomização estratificada** — embaralha ordem **dentro** de cada domínio (previne fadiga por bloco) mas mantém seed por candidato (determinística, para QA) |
| Ordem dos itens reverso/normal | Intercalados naturalmente (banco Johnson já intercala) |
| Avanço página | Exige **todos os 20 itens respondidos** para habilitar botão "Próximo" |
| Voltar página | Permitido (candidato pode revisar respostas antes de submit) |
| Salvamento | **Autosave incremental** a cada resposta (POST `/api/bigfive/responder`) → resiliente a queda de conexão |
| Conclusão | Tela de submit final com botão "Finalizar e enviar" + confirmação modal |
| Retomada | Candidato pode fechar aba e voltar; sistema retoma na última página não concluída |
| Tentativas | **1 tentativa por candidatura**. Refazer requer reset manual pelo RH + justificativa auditada |
| Dispositivo | Desktop + mobile (design system responsivo — UI-SPEC existente) |
| Acessibilidade | Navegação por teclado, ARIA labels, contraste AA, fonte redimensionável |

### 6.1 Instruções (copy definitivo para Tela 1)

```
Avaliação de Perfil Comportamental — Big Five

Esta avaliação tem 120 afirmações sobre como você normalmente age, pensa
e se sente. Não existem respostas certas ou erradas — queremos entender
seu jeito de ser, não testar seu conhecimento.

Leia cada frase e escolha a opção que MELHOR descreve você, entre:

- Discordo totalmente
- Discordo parcialmente
- Nem discordo, nem concordo
- Concordo parcialmente
- Concordo totalmente

Tempo estimado: 15 a 20 minutos. Você pode pausar e voltar depois —
suas respostas são salvas automaticamente.

Responda com sinceridade. O objetivo é verificar se o seu perfil se
encaixa com a vaga e com a cultura Beauty Smile — e isso funciona
melhor quando você é você.
```

---

## 7. Cálculo de Score

### 7.1 Pipeline (pseudocódigo)

```
ENTRADA: respostas = [{item_id, resposta (1-5)}, ...]  (120 linhas)
SAÍDA  : score_json = {
           dominios: {O, C, E, A, N}  (percentil 0-100, média dos 4 itens),
           facets:   {O1..O6, C1..C6, E1..E6, A1..A6, N1..N6} (percentil 0-100),
           meta: { n_respondidas, tempo_total_s, versao_modelo, norma_usada }
         }

PARA cada resposta:
  item  = LOOKUP banco_itens[item_id]    # recupera keyed, domain, facet
  SE item.keyed == "minus":
    valor = 6 - resposta                 # reverse 1↔5, 2↔4, 3=3
  SENÃO:
    valor = resposta

  # acumular por facet
  facet_key = item.domain + item.facet   # ex: "N1"
  acumuladores[facet_key].append(valor)

# 1) facet raw score = média dos 4 itens (range 1-5)
PARA cada facet_key em 30 facets:
  facet_raw[facet_key] = MEAN(acumuladores[facet_key])

# 2) domain raw score = soma dos 24 itens do domínio (range 24-120)
#    OU média dos 6 facets (equivalente matematicamente × 4)
PARA cada domain em [O, C, E, A, N]:
  domain_raw[domain] = SUM(todos 24 itens do domínio, já reverse-codeados)

# 3) prorata se houver item skipado (RFC: max 5% de missing tolerado)
# 4) normalização → percentil

PARA cada score_raw:
  z = (score_raw - norm_mean) / norm_sd
  percentil = Φ(z) * 100                 # cumulative standard normal
  OU (se norm for amostra fechada):
  percentil = percentile_rank(score_raw, norm_sample)

RETORNAR score_json
```

### 7.2 Fórmulas explícitas

**Facet score (raw):**
$$
\text{facet}_{k} = \frac{1}{4} \sum_{i \in \text{itens}(k)} v_i
$$
onde $v_i$ = resposta já reverse-codeada se `keyed = minus`. Range: 1.00 a 5.00.

**Domain score (raw):**
$$
\text{domain}_{D} = \sum_{i \in \text{itens}(D)} v_i
$$
Range: 24 a 120 (24 itens × score 1-5).

**Conversão para percentil (método z-score + CDF normal):**
$$
z_D = \frac{\text{domain}_D - \mu_D}{\sigma_D}
$$
$$
\text{percentil}_D = 100 \cdot \Phi(z_D)
$$
onde $\mu_D, \sigma_D$ vêm da norma ativa e $\Phi$ é a CDF normal padrão.

### 7.3 Reverse-coded items

Dos 120 itens do IPIP-NEO-120, a proporção de itens com chave positiva por domínio é (Kajonius & Johnson, 2019):
- Neuroticismo: ~71% plus, ~29% minus
- Extroversão: ~75% plus, ~25% minus
- Abertura: ~50% plus, ~50% minus
- Amabilidade: ~29% plus, ~71% minus
- Conscienciosidade: ~46% plus, ~54% minus

**Não hardcodar quais items são reversos** — a flag `keyed` vem do próprio banco importado do repo Alheimsins e deve ser fonte da verdade.

### 7.4 Prorata para itens em branco (missing data)

- Se candidato pular ≤ 1 item por facet (< 25% da facet): usar média dos itens respondidos do facet.
- Se pular 2+ itens de um facet: marcar facet como `null` no `score_json` e alertar RH.
- Se > 5% dos 120 itens em branco (> 6 itens): invalidar a submissão (exigir retomada).

Em V3 MVP, **exigir todos os 120 itens** (não permitir skip) — prorata só vale se bug de frontend deixar algum em branco.

### 7.5 Versionamento do modelo de score

`scores_candidato.versao_modelo` = string `'ipip-neo-120-ptbr-bs-v1'`. Se formula ou normas mudarem, bump para `v2`. Scores antigos nunca são recalculados; novos candidatos usam versão ativa.

---

## 8. Normas de Comparação

### 8.1 Situação das normas

| Norma | Disponibilidade | Uso |
|---|---|---|
| **US sample Johnson (N=619.150)** | Disponível via Johnson's data repository (OSF `osf.io/tbmh5`) — raw data CSV | Uso imediato V3 |
| **Brasil — amostra nacional representativa** | **Não publicada** para IPIP-NEO-120 | Gap — ver §13 |
| **Brasil — BFP** (Nunes, Hutz & Nunes) | Sim, proprietária | Não aplicável (instrumento diferente) |
| **Beauty Smile — norma interna** | A construir | **Meta V4:** ≥ 200 colaboradores ativos respondem para gerar norma local por cargo |

### 8.2 Recomendação imediata (V3)

1. **Normalização inicial:** calcular z-score usando `μ, σ` da amostra Johnson US (disponível pública via OSF repository). Traduzir z em percentil via CDF normal. Esse é o mesmo approach adotado por todas as implementações open-source (Alheimsins, `five-factor-e`).
2. **Exibir disclaimer** no perfil do candidato: *"Percentis comparados à norma internacional IPIP-NEO (Johnson, 2014, N=619.150). Norma brasileira em construção."*
3. **Coletar amostra BS** em paralelo — todo candidato aprovado contribui para dataset. Aos 200+ candidatos, validar se distribuição brasileira diverge significativamente da US (teste K-S por domínio).

### 8.3 Tabela de normas (seed V3 — a popular com Johnson 2014)

Armazenar normas em tabela `norma_bigfive`:

```sql
CREATE TABLE norma_bigfive (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  norma_codigo       text NOT NULL UNIQUE,   -- ex: 'johnson-2014-us'
  descricao          text NOT NULL,
  n_amostra          int  NOT NULL,
  dominio            text NOT NULL CHECK (dominio IN ('O','C','E','A','N')),
  facet_code         text,                   -- NULL para domain; 'N1'..'C6' para facet
  media              numeric NOT NULL,
  desvio_padrao      numeric NOT NULL,
  ativo              boolean NOT NULL DEFAULT true,
  criado_em          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ON norma_bigfive (norma_codigo, dominio, facet_code);
```

Uma linha para cada combinação (norma × domain) e (norma × facet). Total esperado: 1 norma ativa × (5 domains + 30 facets) = 35 linhas.

### 8.4 Valores seed Johnson 2014 (domain-level, a confirmar com CSV original)

| Dominio | μ (raw 24-120) | σ |
|---|---|---|
| N | ~72 | ~13 |
| E | ~78 | ~12 |
| O | ~83 | ~11 |
| A | ~90 | ~10 |
| C | ~85 | ~12 |

> ⚠️ **Estes valores são aproximações de literatura secundária** (Kajonius & Johnson 2019, Maples-Keller 2019). **Engenharia DEVE baixar o CSV raw de `osf.io/tbmh5` e recalcular `μ, σ` por domínio e por facet antes do go-live.** Vide §13 gap G-03.

---

## 9. Modelo de Dados (SQL DDL)

### 9.1 Tabela de banco de itens (seed estático)

```sql
CREATE TABLE item_bigfive (
  id            uuid PRIMARY KEY,             -- UUID do repo Alheimsins (preservar)
  texto_ptbr    text NOT NULL,
  keyed         text NOT NULL CHECK (keyed IN ('plus','minus')),
  dominio       text NOT NULL CHECK (dominio IN ('O','C','E','A','N')),
  facet         int  NOT NULL CHECK (facet BETWEEN 1 AND 6),
  versao_banco  text NOT NULL DEFAULT 'ipip-neo-120-ptbr-bs-v1',
  criado_em     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON item_bigfive (versao_banco, dominio, facet);
```

Seed: rodar migration que importa JSON de `data/pt-br/questions.json` (120 linhas).

### 9.2 Tabela de respostas (uma linha por item respondido)

```sql
CREATE TABLE respostas_bigfive (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id     uuid NOT NULL REFERENCES candidaturas(id) ON DELETE CASCADE,
  item_id            uuid NOT NULL REFERENCES item_bigfive(id),
  resposta           smallint NOT NULL CHECK (resposta BETWEEN 1 AND 5),
  versao_banco       text NOT NULL,          -- copia de item_bigfive.versao_banco para snapshot
  respondido_em      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidatura_id, item_id)           -- garante 1 resposta por item por candidatura
);

CREATE INDEX ON respostas_bigfive (candidatura_id);
```

**Decisão de design:** uma linha por resposta (NÃO JSON blob). Permite analítico SQL direto, rastreabilidade por item (ex: "item X é confuso? alta taxa de middle-response?"), e auditoria LGPD.

### 9.3 Atualização na `scores_candidato` (já definida em §6.2 do Master)

```sql
-- Já existe na Fase 9.5 do PRD-MASTER. Apenas usamos com tipo_teste='bigfive'.
INSERT INTO scores_candidato (
  candidatura_id,
  tipo_teste,            -- 'bigfive'
  score_principal,       -- score agregado 0-100 (ver §11.3)
  score_json,            -- { dominios: {...}, facets: {...}, meta: {...} }
  versao_modelo,         -- 'ipip-neo-120-ptbr-bs-v1'
  norma_usada,           -- 'johnson-2014-us' ou 'bs-internal-2026-v1'
  criado_em
) VALUES (...);
```

**Exemplo de `score_json`:**
```json
{
  "dominios": {
    "O": { "raw": 92, "z": 0.82, "percentil": 79 },
    "C": { "raw": 105, "z": 1.67, "percentil": 95 },
    "E": { "raw": 84, "z": 0.50, "percentil": 69 },
    "A": { "raw": 100, "z": 1.00, "percentil": 84 },
    "N": { "raw": 58, "z": -1.08, "percentil": 14 }
  },
  "facets": {
    "N1": { "raw": 2.50, "percentil": 30 },
    "N2": { "raw": 2.25, "percentil": 22 },
    "...": "..."
  },
  "meta": {
    "n_respondidas": 120,
    "tempo_total_s": 1143,
    "versao_modelo": "ipip-neo-120-ptbr-bs-v1",
    "norma_usada": "johnson-2014-us",
    "iniciado_em": "2026-04-20T14:12:03Z",
    "concluido_em": "2026-04-20T14:31:06Z"
  }
}
```

### 9.4 Views de apoio

```sql
-- RPC/view que o frontend chama para o candidato ver seus próprios scores
CREATE OR REPLACE VIEW v_score_bigfive_candidato AS
SELECT
  s.candidatura_id,
  s.score_json -> 'dominios' AS dominios,
  s.score_json -> 'meta' AS meta,
  s.criado_em
FROM scores_candidato s
WHERE s.tipo_teste = 'bigfive';

-- RH view inclui facets e detalhes:
CREATE OR REPLACE VIEW v_score_bigfive_rh AS
SELECT s.* FROM scores_candidato s WHERE s.tipo_teste = 'bigfive';
```

### 9.5 RLS policies

```sql
-- respostas: candidato só vê suas; RH vê todas
ALTER TABLE respostas_bigfive ENABLE ROW LEVEL SECURITY;

CREATE POLICY respostas_bigfive_candidato_self ON respostas_bigfive
  FOR SELECT USING (
    candidatura_id IN (
      SELECT id FROM candidaturas WHERE candidato_id = auth.uid()
    )
  );

CREATE POLICY respostas_bigfive_candidato_insert ON respostas_bigfive
  FOR INSERT WITH CHECK (
    candidatura_id IN (
      SELECT id FROM candidaturas WHERE candidato_id = auth.uid()
    )
  );

CREATE POLICY respostas_bigfive_rh_read ON respostas_bigfive
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('rh','admin'))
  );
```

---

## 10. UX Detalhada (wireframe textual)

Design system: `beauty-smile-design-system` (variáveis já existentes no repo).

### 10.1 Tela 1 — Instruções + Consentimento LGPD

```
┌─────────────────────────────────────────────────────────────┐
│ Beauty Smile                                         logout │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Avaliação de Perfil Comportamental — Big Five             │
│                                                             │
│   Tempo estimado: 15-20 min   │   120 afirmações            │
│                                                             │
│   [copy das instruções §6.1]                                │
│                                                             │
│   ─────────────────────────────────────────                 │
│                                                             │
│   Consentimento (LGPD)                                      │
│                                                             │
│   [ ] Li e concordo com o uso de minhas respostas para      │
│       avaliação no processo seletivo da vaga X, conforme    │
│       Política de Privacidade.                              │
│                                                             │
│   [ ] Autorizo o compartilhamento do resultado com a equipe │
│       de RH da Beauty Smile.                                │
│                                                             │
│                       [ Voltar ]  [ Começar avaliação → ]   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- Botão "Começar" só habilita com ambos os checks marcados.
- Clique em "Começar" → `POST /api/bigfive/iniciar` cria linha em `testes_sessao` (opcional para auditoria) e redireciona para Tela 2 página 1.

### 10.2 Tela 2 — Itens paginados (20 por página, 6 páginas)

```
┌─────────────────────────────────────────────────────────────┐
│ Big Five — Página 2 de 6                          ⏱ 7:23    │
│ ████████░░░░░░░░░░░░░░░░  33% concluído                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ 21. Me preocupo com as coisas                               │
│     ○ Discordo   ○ Parcial   ○ Neutro   ● Parcial   ○ Conc. │
│      totalmente   discordo              concordo  totalm.   │
│                                                             │
│ 22. Faço amigos com facilidade                              │
│     ● ○ ○ ○ ○                                               │
│                                                             │
│ [... 18 itens mais ...]                                     │
│                                                             │
│ 40. Tenho uma imaginação fértil                             │
│     ○ ○ ○ ○ ○                                               │
│                                                             │
│                       [ ← Anterior ]   [ Próxima página → ] │
│                                                             │
│  💾 Suas respostas são salvas automaticamente.              │
└─────────────────────────────────────────────────────────────┘
```

**Interação:**
- Cada resposta dispara `POST /api/bigfive/responder` em background (autosave, optimistic UI).
- Botão "Próxima página" só habilita com todos os 20 itens da página respondidos.
- "Anterior" sempre habilitado (exceto na página 1).
- Progresso geral calculado como `(itens_respondidos / 120) * 100`.
- Mobile: 1 item por vez (melhor UX que 20 scrollados no celular).
- Labels de escala: versão curta ("Discordo totalmente", "Parcial. discordo", "Neutro", "Parcial. concordo", "Concordo totalmente") em desktop; radio com hint em mobile.
- Item número exibido como 1/120, 2/120, ..., 120/120 (não reveal de domínio).

### 10.3 Tela 3 — Confirmação de envio

```
┌─────────────────────────────────────────────────────────────┐
│ Big Five — Revisão final                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ✅ Todas as 120 respostas foram registradas.              │
│                                                             │
│   Antes de enviar, quer voltar e revisar alguma?            │
│                                                             │
│   [ ← Voltar à última página ]                              │
│                                                             │
│   Ao clicar em "Finalizar", sua avaliação será              │
│   submetida para análise e você não poderá alterar as       │
│   respostas.                                                │
│                                                             │
│                               [ Finalizar e enviar → ]      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

Clique em "Finalizar" → modal de confirmação → `POST /api/bigfive/finalizar`:
- backend dispara compute de scores (função `calcular_scores_bigfive(candidatura_id)`).
- grava linha em `scores_candidato`.
- atualiza `candidaturas.bigfive_concluido_em`.
- dispara webhook n8n (PRD-0011) para análise agregada.
- redireciona candidato para dashboard com toast "Avaliação Big Five enviada!".

### 10.4 Tela 4 (candidato) — Visualização de seu próprio resultado

Pós-submit, candidato vê em seu dashboard:
- 5 barras horizontais, uma por domínio, com percentil (0-100).
- Texto descritivo pt-BR curto por domínio (ex: "Conscienciosidade 85: você tende a ser organizado, metódico e orientado a metas.").
- **Não mostrar ao candidato** se passou/reprovou no threshold — apenas o score. Decisão fica com RH.

### 10.5 Tela RH — Visualização no perfil do candidato

- 5 barras de domínio, cada uma com a **faixa ideal** da vaga sobreposta em verde claro.
- Badge verde ✅ "Dentro do perfil" se todos os domínios caem dentro da faixa ideal E atingem threshold.
- Badge vermelho 🚩 "Fora do perfil" se algum domínio fica abaixo do threshold eliminatório.
- Modal expandido com todos os 30 facets (barras menores) sob demanda.
- Botão "Exportar PDF" para anexar ao processo seletivo.

---

## 11. Integração com Perfil Ideal da Vaga

Referência: PRD-MASTER §6.2 tabela `vaga_testes_aplicaveis` + RF-33a/b.

### 11.1 Schema relevante (já existe em V3)

```sql
-- tabela existente — apenas como recap
CREATE TABLE vaga_testes_aplicaveis (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id                 uuid NOT NULL REFERENCES vagas(id) ON DELETE CASCADE,
  tipo_teste              text NOT NULL CHECK (tipo_teste IN ('bigfive','disc','cognitivo','cultura')),
  obrigatoriedade         text NOT NULL CHECK (obrigatoriedade IN ('obrigatorio','opcional','nao_aplicar')),
  peso                    numeric CHECK (peso BETWEEN 0 AND 100),
  threshold_eliminatorio  numeric,
  faixa_ideal_json        jsonb,
  UNIQUE (vaga_id, tipo_teste)
);
```

### 11.2 Semântica dos campos para Big Five

**`obrigatoriedade`:**
- `obrigatorio` → candidato não avança sem concluir Big Five.
- `opcional` → pode pular, mas aparece sinalizado no perfil.
- `nao_aplicar` → teste invisível para essa vaga.

**`peso`:** 0-100. Usado no cálculo de score agregado da candidatura (feito pelo n8n em PRD-0011, não aqui).

**`threshold_eliminatorio`:** número único representando o **score composto mínimo** (0-100) que o candidato deve atingir. Formato do threshold é definido pelo RH por vaga. Recomendação:
- **Padrão:** threshold = 50 (percentil médio). Candidatos abaixo disso sinalizam flag vermelha.
- **Avançado:** threshold composto por domínio (ex: `{C: 60, N: 40, ...}` — mas isso vai em `faixa_ideal_json`, não em `threshold_eliminatorio`).

Para MVP V3, `threshold_eliminatorio` é interpretado como: **"se a afinidade geral (fit score) < threshold, sinalizar 🚩"**.

**`faixa_ideal_json`:** formato definido para Big Five:

```json
{
  "O": { "min": 40, "max": 90, "ideal": 65 },
  "C": { "min": 60, "max": 100, "ideal": 85 },
  "E": { "min": 30, "max": 90, "ideal": 60 },
  "A": { "min": 50, "max": 100, "ideal": 75 },
  "N": { "min": 0,  "max": 50, "ideal": 25 }
}
```

Todos os valores em percentis (0-100). `min`/`max` define a faixa aceitável; `ideal` é o centro da expectativa (ponta do gráfico). Candidato dentro da faixa não sinaliza flag.

### 11.3 Fórmula de afinidade (fit score) Big Five

Fit = média ponderada da "distância ao ideal" por domínio, convertida em score 0-100:

```
fit_dominio_D = 100 - |percentil_candidato_D - ideal_D| / 50 * 100 * max(0, 1 - penalty)
```

Mais simples e utilizada em V3:

```python
def fit_bigfive(score_json, faixa_ideal_json):
    total = 0
    domains = ['O','C','E','A','N']
    for D in domains:
        p_cand = score_json['dominios'][D]['percentil']
        faixa = faixa_ideal_json[D]
        if faixa['min'] <= p_cand <= faixa['max']:
            # dentro da faixa: score proporcional à proximidade do ideal
            dist = abs(p_cand - faixa['ideal'])
            fit_D = 100 - dist  # 100 se bate no ideal exato
        else:
            # fora da faixa: penalidade severa
            if p_cand < faixa['min']:
                fit_D = max(0, 100 - (faixa['min'] - p_cand) * 2)
            else:  # p_cand > faixa['max']
                fit_D = max(0, 100 - (p_cand - faixa['max']) * 2)
        total += fit_D
    return total / 5  # média simples; ponderação fica na composição de testes (PRD-0011)
```

Output → `scores_candidato.score_principal` (0-100).

### 11.4 Exemplos de perfis ideais por cargo (seed a calibrar com RH BS)

**Dentista clínico:**
```json
{
  "O": { "min": 40, "max": 85, "ideal": 60 },
  "C": { "min": 65, "max": 100, "ideal": 85 },
  "E": { "min": 35, "max": 80, "ideal": 55 },
  "A": { "min": 55, "max": 100, "ideal": 75 },
  "N": { "min": 0,  "max": 45, "ideal": 25 }
}
```

**Recepcionista:**
```json
{
  "O": { "min": 30, "max": 80, "ideal": 55 },
  "C": { "min": 55, "max": 95, "ideal": 75 },
  "E": { "min": 60, "max": 100, "ideal": 80 },
  "A": { "min": 65, "max": 100, "ideal": 85 },
  "N": { "min": 0,  "max": 50, "ideal": 30 }
}
```

**Coordenador de clínica:**
```json
{
  "O": { "min": 45, "max": 90, "ideal": 70 },
  "C": { "min": 70, "max": 100, "ideal": 90 },
  "E": { "min": 55, "max": 95, "ideal": 75 },
  "A": { "min": 50, "max": 90, "ideal": 70 },
  "N": { "min": 0,  "max": 40, "ideal": 20 }
}
```

> Esses perfis são **seed inicial** baseados em literatura meta-analítica (Barrick & Mount, 1991; Salgado, 1997). **RH deve ajustar** após piloto com colaboradores BS atuais em cada função.

---

## 12. LGPD

### 12.1 Bases legais (LGPD art. 7º)

- **Consentimento** do candidato (art. 7º, I) — obtido na Tela 1 antes de iniciar.
- **Execução de contrato / procedimento preliminar** (art. 7º, V) — processo seletivo configura "procedimento preliminar a contrato".

### 12.2 Dados coletados

| Categoria | Dado | Sensibilidade |
|---|---|---|
| Identificação | candidatura_id (FK) | Normal |
| Comportamental | 120 respostas Likert | **Personalidade → dado potencialmente sensível** (art. 5º, II interpretação expansiva em contexto de emprego) |
| Metadados | timestamps, tempo total | Normal |

### 12.3 Direitos do titular (art. 18)

1. **Confirmação / acesso:** candidato vê seus próprios scores de domínio no dashboard (Tela 4). Facets sob demanda via botão "Relatório completo (PDF)".
2. **Retificação:** não aplicável — respostas são declaração pontual (candidato não refaz após submit; se insistir, RH pode resetar com auditoria).
3. **Eliminação:** candidato pode solicitar exclusão da candidatura. Isso dispara `DELETE CASCADE` em `respostas_bigfive`. Scores agregados em `scores_candidato` também deletados.
4. **Portabilidade:** endpoint `GET /api/bigfive/meus-dados` retorna JSON com respostas + scores (formato legível).
5. **Revisão de decisão automatizada (art. 20):** se o sistema sinalizar "fora do perfil" e isso influenciar rejeição, candidato tem direito a **revisão humana** — garantido por RNF-07a (decisão de rejeição é sempre manual). UI de rejeição pelo RH exige campo "motivo" obrigatório.

### 12.4 Retenção

- Respostas + scores retidos por **24 meses** após última interação (alinhado ao período LGPD para processos seletivos).
- Anonimização após esse prazo para fins estatísticos (construção de norma BS): manter `score_json` agregado, remover `candidatura_id` e `respostas_bigfive`.

### 12.5 Consentimento — copy no checkbox

```
Ao marcar esta opção, autorizo a Beauty Smile a coletar, armazenar e
processar minhas respostas ao inventário de personalidade IPIP-NEO-120
com a finalidade exclusiva de avaliação no processo seletivo da vaga em
que me candidatei. Entendo que:

(a) o resultado é comparado ao perfil ideal da vaga para orientar, mas
    não decide automaticamente, minha seleção;
(b) tenho direito a acessar, exportar e solicitar exclusão de meus
    dados a qualquer momento, conforme a LGPD;
(c) a decisão final de aprovação ou não é sempre tomada por uma
    pessoa da equipe de RH, com base em múltiplos critérios.
```

### 12.6 Segurança

- Dados em Supabase (AWS SA-East-1) — criptografia at-rest por padrão.
- Transporte HTTPS obrigatório.
- RLS policies garantem que candidato só acessa seus próprios dados.
- Logs de acesso por RH auditáveis em tabela `audit_log` (já existente).

---

## 13. Gaps e Decisões Pendentes

| ID | Tipo | Descrição | Owner | Deadline |
|---|---|---|---|---|
| **D-01** | Decisão | Aprovar adoção de IPIP-NEO-120 pt-BR (Alheimsins MIT) como banco V3 | Psicólogo consultor + Fernando | Antes Fase 9.1 |
| **D-02** | Decisão | Aprovar copy dos checkboxes de consentimento LGPD | Jurídico + DPO | Antes Fase 9.1 |
| **D-03** | Decisão | Aprovar perfis ideais seed por cargo (§11.4) | RH BS (workshop) | Antes Fase 9.1 |
| **G-01** | Gap | Revisão linguística dos 120 itens pt-BR por psicólogo consultor | Psicólogo consultor | Fase 9.1 semana 1 |
| **G-02** | Gap | Piloto com 20-30 colaboradores atuais BS para calibrar linguagem | RH + Eng | Fase 9.1 semana 2 |
| **G-03** | Gap | Baixar raw CSV Johnson 2014 (osf.io/tbmh5) e recalcular μ/σ por domínio e facet | Eng (script Python em `scripts/`) | Fase 9.1 semana 1 |
| **G-04** | Gap | Construir amostra interna BS (≥200 candidatos ativos) para norma local V4 | RH + Eng | Pós-V3 |
| **G-05** | Gap | Validar com jurídico a linguagem "avaliação de perfil" vs "teste psicológico" (Res. CFP 31/2022) | Jurídico | Antes go-live |
| **G-06** | Gap | Implementar endpoint `GET /api/bigfive/meus-dados` para portabilidade LGPD | Eng | Fase 9.1 semana 3 |
| **G-07** | Gap | Template de relatório PDF (candidato + RH) | Design + Eng | Fase 9.1 semana 3 |
| **G-08** | Gap | Teste A/B de paginação desktop (1 item × 20 itens por página) | Design + Eng | Pós-V3 |
| **G-09** | Risco | Definir política em caso de retake solicitado pelo candidato (hoje: 1 tentativa + reset RH) | RH | Antes go-live |
| **G-10** | Risco | Social desirability bias: candidato responde "o que RH quer ouvir". Mitigar via instrução + itens reversos (parcial; não há escala de desejabilidade no IPIP-NEO-120) | Psicólogo consultor | Nota em relatório RH |

### 13.1 Decisões já tomadas (registradas aqui para histórico)

- **DT-01:** Adotar IPIP-NEO-120 ao invés de NEO-PI-R (evita SATEPSI / psicólogo CFP obrigatório).
- **DT-02:** Adotar IPIP-NEO-120 ao invés de Mini-IPIP (trade-off: +15 min de tempo em troca de 30 facets de granularidade).
- **DT-03:** Banco pt-BR do repo Alheimsins (MIT) como ponto de partida; revisão linguística por psicólogo.
- **DT-04:** Paginação 20 itens/página desktop, 1 item/página mobile.
- **DT-05:** Uma linha por resposta em `respostas_bigfive` (NÃO blob JSON).
- **DT-06:** Score armazenado em `scores_candidato` unificado (formato já definido no Master).
- **DT-07:** Percentis computados via z-score com norma Johnson 2014 US em V3; norma BS interna em V4.
- **DT-08:** Candidato vê 5 domínios; facets só sob demanda em relatório PDF.
- **DT-09:** RH vê domínios + faixa ideal + facets expandidos. Badge vermelha em flag, mas decisão de rejeitar é sempre humana.
- **DT-10:** Linguagem do produto usa "avaliação de perfil comportamental", nunca "teste psicológico" (compliance CFP 31/2022).

---

## 14. Referências Bibliográficas

- Barrick, M. R., & Mount, M. K. (1991). The Big Five personality dimensions and job performance: A meta-analysis. *Personnel Psychology*, 44(1), 1-26.
- Costa, P. T., & McCrae, R. R. (1992). *Revised NEO Personality Inventory (NEO-PI-R) and NEO Five-Factor Inventory (NEO-FFI) Professional Manual.* PAR.
- CFP (Conselho Federal de Psicologia). (2022). *Resolução CFP nº 31/2022 — Diretrizes para avaliação psicológica.* Disponível em: [site.cfp.org.br](https://site.cfp.org.br/)
- Goldberg, L. R. (1999). A broad-bandwidth, public-domain, personality inventory measuring the lower-level facets of several five-factor models. In Mervielde, I., Deary, I., De Fruyt, F., & Ostendorf, F. (Eds.), *Personality Psychology in Europe, Vol. 7* (pp. 7-28). Tilburg University Press.
- IPIP. International Personality Item Pool. [https://ipip.ori.org](https://ipip.ori.org)
- Johnson, J. A. (2014). Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory: Development of the IPIP-NEO-120. *Journal of Research in Personality, 51*, 78-89. [doi:10.1016/j.jrp.2014.05.003](https://doi.org/10.1016/j.jrp.2014.05.003)
- Kajonius, P. J., & Johnson, J. A. (2019). Assessing the Structure of the Five Factor Model of Personality (IPIP-NEO-120) in the Public Domain. *Europe's Journal of Psychology, 15*(2), 260-275. [PMC7871748](https://pmc.ncbi.nlm.nih.gov/articles/PMC7871748/)
- Maples-Keller, J. L., Williamson, R. L., Sleep, C. E., Carter, N. T., Campbell, W. K., & Miller, J. D. (2019). Using item response theory to develop a 60-item representation of the NEO PI-R using the IPIP. *Journal of Personality Assessment, 101*(1), 4-15.
- Nunes, C. H. S. S., Hutz, C. S., & Nunes, M. F. O. (2010). *Bateria Fatorial de Personalidade (BFP): manual técnico.* Casa do Psicólogo.
- Salgado, J. F. (1997). The Five Factor Model of personality and job performance in the European Community. *Journal of Applied Psychology, 82*(1), 30-43.
- SATEPSI — Sistema de Avaliação de Testes Psicológicos do CFP. [https://satepsi.cfp.org.br](https://satepsi.cfp.org.br)

### 14.1 Recursos de código / dados

- **Banco de itens pt-BR (120 itens, MIT):** [github.com/Alheimsins/b5-johnson-120-ipip-neo-pi-r/tree/main/data/pt-br](https://github.com/Alheimsins/b5-johnson-120-ipip-neo-pi-r/tree/main/data/pt-br)
- **Dados raw Johnson 2014 (N=619.150) para normas:** [osf.io/tbmh5](https://osf.io/tbmh5)
- **Scoring key oficial IPIP-NEO-120/300:** [osf.io/ycvdk](https://osf.io/ycvdk)
- **Biblioteca Python de referência (scoring + normalização):** [github.com/NeuroQuestAi/five-factor-e](https://github.com/NeuroQuestAi/five-factor-e)
- **Implementação live de referência:** [bigfive-test.com](https://bigfive-test.com)
- **Tabela oficial dos 30 facets IPIP-NEO:** [ipip.ori.org/newNEO_FacetsTable.htm](https://ipip.ori.org/newNEO_FacetsTable.htm)

---

## Changelog

- **2026-04-19 v1.0** — Versão inicial, pronta para review. Autor: Fernando Costa.
