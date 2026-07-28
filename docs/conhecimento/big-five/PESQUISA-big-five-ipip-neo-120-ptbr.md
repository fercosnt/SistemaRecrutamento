# PESQUISA — Big Five / IPIP-NEO-120 em PT-BR para ATS Odontológico

> **Compilado em:** 2026-04-27 (04:00 BRT, execução autônoma agendada)
> **Modo:** Deep Research | **Subagentes:** 4 (Sonnet paralelos) | **Fontes consultadas:** ~50
> **Documento-mãe:** [PESQUISA-sistema-avaliacao-candidatos-recrutamento.md](PESQUISA-sistema-avaliacao-candidatos-recrutamento.md) — pesquisa-irmã sobre o ATS odontológico
> **Pasta de fontes:** [fontes/big-five-ipip/](fontes/big-five-ipip/) — 6 PDFs + 2 JSONs (item bank EN/PT-BR)
>
> **Pergunta-mãe:** É viável usar o IPIP-NEO-120 (Big Five / OCEAN, Goldberg/Johnson, domínio público) como **contexto comportamental não-eliminatório** num ATS próprio para rede de clínicas odontológicas no Brasil — auto-aplicado pelo candidato, sem psicólogo no time?

---

## ÍNDICE

1. [Resumo Executivo — 10 verdades que mudam o projeto](#1-resumo-executivo)
2. [Status do IPIP-NEO-120 em PT-BR](#2-status-ptbr)
3. [Ecossistema Brasileiro de Big Five — Mapa](#3-mapa-instrumentos)
4. [Item Bank do IPIP-NEO-120 — Acesso e Licença](#4-item-bank)
5. [Algoritmo de Scoring (Johnson 2014) — Implementação](#5-scoring)
6. [Risco CFP/SATEPSI — Veredito Jurídico](#6-cfp)
7. [Plan B Priorizado](#7-plan-b)
8. [Recomendação Executiva — 3 Cenários](#8-recomendacao)
9. [Implementação Concreta no ATS](#9-implementacao)
10. [Gaps e Próximos Passos](#10-gaps)
11. [Fontes Tieradas](#11-fontes)

---

<a id="1-resumo-executivo"></a>
## 1. RESUMO EXECUTIVO — 10 VERDADES QUE MUDAM O PROJETO

### Sobre o IPIP-NEO-120 em PT-BR

1. **Não existe validação acadêmica formal do IPIP-NEO-120 em PT-BR publicada.** Nenhum paper peer-reviewed (SciELO, PePSIC, PubMed, repositórios institucionais) valida especificamente os 120 itens de Johnson (2014) com amostra brasileira e normas brasileiras. O site oficial [ipip.ori.org/PortugueseItems.htm](https://ipip.ori.org/newItemTranslations.htm) lista apenas traduções dos **Big-Five Factor Markers** (50 itens — Pontarolo; 100 itens — Brockveld), **não** do IPIP-NEO-120. A tradução PT-BR mais usada vem do repo [NeuroQuestAi/five-factor-e](https://github.com/NeuroQuestAi/five-factor-e) (Grazziano Duarte, sem rastreio acadêmico).

2. **A tradução PT-BR funcional existe e é PT-BR genuíno (não PT-PT).** Confirmado: o JSON `questions-pt-br.json` do `five-factor-e` traduz os 120 itens com construções PT-BR ("Me preocupo com as coisas" — não "Preocupo-me"). Mas **não passou por painel de juízes ou tradução-reversa documentada** — requisito mínimo das diretrizes CFP/SATEPSI.

3. **O IPIP é domínio público total — sem restrição comercial, sem necessidade de pedir permissão.** Texto literal de [ipip.ori.org/newPermission.htm](https://ipip.ori.org/newPermission.htm): _"Because the IPIP has been placed in the public domain, permission has already been automatically granted for any person to use IPIP items, scales, and inventories for any purpose, commercial or non-commercial."_ Isso não tem equivalente em **nenhum** outro instrumento Big Five.

### Sobre risco regulatório (Brasil)

4. **A Resolução CFP 31/2022 enquadra "questionários" e "inventários" como teste psicológico.** O Art. 10 lista expressamente: _"testes, escalas, inventários, questionários, métodos projetivos e expressivos"_. Renomear o produto não muda o enquadramento — é a **finalidade de seleção profissional** que importa, não o nome.

5. **O IPIP-NEO-120 NÃO consta no SATEPSI.** Os únicos Big Five aprovados pelo CFP são **NEO PI-R** e **NEO FFI-R** (Vetor, 11/04/2008, prazo expirado em 2023 — verificar renovação) e **BFP** (Pearson, 01/08/2009, vigente até 25/10/2039). Todos comerciais e privativos a psicólogos.

6. **O CFP encaminha à Polícia Federal casos de DISC/PAT/PI usados sem psicólogo em seleção** — texto literal da [Nota Técnica do SATEPSI](https://satepsi.cfp.org.br/docs/notaTecnica.pdf). A ADI 3481/STF (2021) liberou a *venda* de testes a leigos, mas o STF foi explícito: o uso profissional continua reservado a psicólogos.

7. **Precedente trabalhista existe.** TRT-2/SP invalidou processo seletivo que filtrou candidatos por MBTI, fundamentado na Lei 9.029/1995 (anti-discriminação) — não apenas na regulação CFP. A Justiça do Trabalho tem condenado coletas de "perfil comportamental" sem base LGPD adequada.

### Sobre as alternativas

8. **BFI-2 (Soto & John 2017, validado em PT-BR por Pires/Nunes/Primi 2023, n=908) é o melhor Plan B.** Validação brasileira publicada em SciELO 2023, 60 itens, 15 facetas, alfa 0.82–0.90, CFI=0.94, RMSEA=0.03. Não-domínio-público (copyright Berkeley) mas **gratuito para pesquisa não-comercial** — uso comercial em ATS exige formalização com Soto/John (processo simples, resposta usual é "sim para fins não-clínicos").

9. **HEXACO-60 é o "Plan B com diferencial" para o setor saúde.** O 6º fator **Honesty-Humility (H)** prediz comportamento antiético, absenteísmo por fingimento e furto no trabalho — diretamente relevante para clínicas de saúde (confiança paciente-profissional). Validação BR existe ([Lima, Hauck-Filho & Faiad 2019, n=397](https://doi.org/10.1016/j.paid.2019.05.039)), gratuito para pesquisa, contato com autores para uso comercial.

### Recomendação executiva

10. **O cenário "auto-aplicado, gestor lê resultado, sem psicólogo, score influencia decisão" é juridicamente inviável no Brasil** — risco em 3 frentes: (a) exercício ilegal de função privativa (Art. 8º Res. 31/2022 + Lei 4.119/1962), (b) discriminação Lei 9.029/1995, (c) LGPD por dados comportamentais sem base legal robusta. **Solução viável:** instrumento como **ferramenta de auto-conhecimento entregue ao candidato** (não ao gestor) + reposicionamento "self-assessment de estilo de trabalho" + **psicólogo organizacional como responsável técnico** (mesmo que em consultoria pontual) + dados nunca como fator de triagem ou eliminação. Sem essas mitigações, descartar.

---

<a id="2-status-ptbr"></a>
## 2. STATUS DO IPIP-NEO-120 EM PT-BR

### 2.1 O que existe oficialmente em PT-BR no site IPIP

O site oficial [ipip.ori.org](https://ipip.ori.org/newItemTranslations.htm) (mantido por Lewis Goldberg e John A. Johnson) lista as seguintes traduções **portuguesas** registradas:

| Variante | Itens | Tradutor | Filiação | Cobertura |
|----------|-------|----------|----------|-----------|
| Big-Five Factor Markers PT-BR | 100 | Keila Brockveld | Macquarie Univ. (Austrália) | 5 traços, sem facetas |
| Big-Five Factor Markers PT-PT | 50 | Edilson Pontarolo / João P. Oliveira | UTFPR / Univ. Lusófona | 5 traços, sem facetas |

**O IPIP-NEO-120 (Johnson 2014) NÃO tem entrada no índice oficial de traduções.** O que existe na prática é tradução comunitária no GitHub (vide §4).

### 2.2 Validação brasileira de instrumentos Big Five — o que realmente existe

| Instrumento | Itens | Facetas | Validado BR? | n | α por traço | SATEPSI | Domínio público? |
|-------------|-------|---------|--------------|---|-------------|---------|------------------|
| **IPIP-NEO-120** (Johnson 2014) | 120 | **30** | **Não** | — | — | Não | **Sim** ✓ |
| **BFP** (Nunes & Hutz 2010) | 126 | 14-17 | Sim | 6.599 | 0.74–0.89 | **Favorável** ✓ | Não (Pearson) |
| **NEO PI-R BR** (Flores-Mendoza 2007) | 240 | 30 | Sim | 1.353 | n/d | **Favorável** ✓ | Não (Vetor) |
| **NEO FFI-R BR** (Flores-Mendoza 2007) | 60 | parcial | Sim | 1.353 | n/d | **Favorável** ✓ | Não (Vetor) |
| **IGFP-5** (Andrade 2008) | 44 | Não | Sim | 5.089 | adequado | Não | Sim (tese aberta) |
| **BFI-2 BR** (Pires/Nunes/Primi 2023) | 60 | 15 | Sim (preliminar) | 908 | 0.82–0.90 | Não | Não (Berkeley) |
| **BFI-25 BR** (Roiz Jr. 2023) | 25 | Não | Sim | 490 | 0.63–0.82 | Não | Sim (CC-BY) |
| **IACGF-F** (Palhano/Andrade 2023) | 103 | 27-30 | Sim (piloto) | 285 | 0.85–0.96 | Não | Sim (tese) |
| **Mini-IPIP** | 20 | Não | Validado em PT (Oliveira 2019); não em BR canônico | n/d | 0.65–0.77 | Não | **Sim** ✓ |
| **TIPI BR** (Carvalho & Primi 2008) | 10 | Não | Sim (piloto) | 113 | 0.50–0.65 | Não | **Sim** ✓ |
| **Marcadores Hutz et al. 1998** | 64 | Não | Sim | 976 | 0.78–0.88 | Não | Sim (SciELO) |

**Diagnóstico:** o ecossistema brasileiro de Big Five tem **três zonas distintas**:

- **Zona SATEPSI / proprietária** (BFP, NEO PI-R, NEO FFI-R) — validade institucional máxima, custo R$ 18–38 por aplicação, restrita a psicólogos.
- **Zona acadêmica validada não-proprietária** (IGFP-5, BFI-2 BR, BFI-25, Marcadores Hutz) — paper publicado, livre para pesquisa, status comercial varia.
- **Zona prática operacional** (IPIP-NEO-120, Mini-IPIP) — domínio público, usável em qualquer software, **sem validação BR formal**.

O IPIP-NEO-120 é o único instrumento que combina (a) 30 facetas, (b) tempo razoável (10–20 min), (c) domínio público total. O preço dessa combinação é a **ausência de validação BR formal**.

### 2.3 Risco psicométrico de usar tradução PT-BR não-validada

Os riscos concretos de adotar a tradução `five-factor-e` sem validação interna:

- **Viés de construto** — itens da faceta O6 (Liberalism — política, religião, arte) podem ter saturação fatorial diferente em amostra brasileira vs amostra internacional de Johnson 2014 (predominantemente anglófona).
- **Normas inadequadas** — usar percentis derivados de N>619.000 respondentes online internacionais para classificar candidatos brasileiros pode produzir viés sistemático (ex: brasileiros tendem a pontuar mais alto em Extroversão e Amabilidade que amostras norte-americanas, conforme [Lima & Simões 2014](https://revista.appsicologia.org/index.php/rpsicologia/article/download/534/702/2309/1000)).
- **Ausência de painel de juízes** — não há documentação pública de tradução-reversa, painel de especialistas ou pré-teste cognitivo da versão `five-factor-e`.

**Mitigação prática:** coletar dados de pelo menos **n=300 respondentes brasileiros** (funcionários atuais + candidatos) e fazer análise fatorial exploratória + cálculo de alfas antes de reportar resultados a gestores. Se alfa < 0.70 em algum traço, revisar itens específicos.

---

<a id="3-mapa-instrumentos"></a>
## 3. ECOSSISTEMA BRASILEIRO BIG FIVE — MAPA

### 3.1 As três famílias de instrumentos

```
                       Big Five no Brasil
                              |
        ┌─────────────────────┼─────────────────────┐
        |                     |                      |
   FAMÍLIA NEO          FAMÍLIA BFI/IPIP        FAMÍLIA BR-NATIVA
   (Costa & McCrae)     (Goldberg/John/Soto)    (Hutz/Andrade)
        |                     |                      |
   NEO-PI-R (240)        IPIP-NEO-300 (300)       BFP (126)
   NEO-FFI-R (60)        IPIP-NEO-120 (120) ← FOCO IGFP-5 (44)
   NEO-PI-3 (240)        BFI-44 / BFI-2 (60)      IACGF-F (103)
                         BFI-2-S (30)             Marcadores Hutz (64)
                         Mini-IPIP (20)
                         TIPI (10)
```

A **Família NEO** é a com maior validação clínica e SATEPSI no Brasil mas é toda comercial. A **Família BFI/IPIP** combina rigor (BFI-2) com domínio público (IPIP). A **Família BR-Nativa** tem validação local mais robusta mas restrição comercial.

### 3.2 Por que IPIP-NEO-120 e não as outras

A justificativa do escopo do projeto (ATS odontológico, contexto não-eliminatório, sem licença comercial, auto-aplicado) **descarta logicamente** a maioria:

- **NEO-PI-R / NEO-FFI-R / BFP**: descarta por custo (R$ 18–38/aplicação × 100 candidatos = R$ 1.800–3.800/mês) + restrição CFP (precisa psicólogo).
- **DISC / Sólides / Predictive Index / Hogan**: descarta por proprietary lock-in + custo + sem validação peer-reviewed pública.
- **IGFP-5**: 44 itens só, sem facetas. Adequado para amostragem de massa, **insuficiente como contexto comportamental rico**.
- **BFI-25 / TIPI / Mini-IPIP**: psicometria muito reduzida (alfa 0.50–0.75, sem facetas). Adequado para pesquisa populacional, não para análise individual em seleção.

Restam três candidatos viáveis para o caso:

| Posição | Instrumento | Por quê |
|---------|-------------|---------|
| **#1 (referência)** | IPIP-NEO-120 | Domínio público + 30 facetas + 120 itens (10-20 min) |
| **#2 (Plan B primário)** | BFI-2 (60 itens) | Validação BR 2023 publicada + 15 facetas + tempo curto |
| **#3 (Plan B com diferencial)** | HEXACO-60 | Fator Honesty-Humility único, validação BR 2019 |

---

<a id="4-item-bank"></a>
## 4. ITEM BANK DO IPIP-NEO-120 — ACESSO E LICENÇA

### 4.1 Licença (zero burocracia)

Texto integral da política IPIP em [ipip.ori.org/newPermission.htm](https://ipip.ori.org/newPermission.htm):

> _"Because the IPIP has been placed in the public domain, permission has already been automatically granted for any person to use IPIP items, scales, and inventories **for any purpose, commercial or non-commercial**. It is not necessary to contact the IPIP site author (Lew Goldberg) or the IPIP Consultant (John A. Johnson) for permission to use IPIP materials."_

**Implicações práticas:**
- ✅ Pode usar em produto comercial (ATS pago, SaaS).
- ✅ Pode traduzir, modificar, mesclar com outros instrumentos.
- ✅ Pode hospedar em servidor próprio sem citar autores (citação é boa prática, não exigência).
- ✅ Pode publicar resultados, criar normas próprias, vender análises.
- ⚠️ Não há garantia de validade — usuário assume risco psicométrico.

### 4.2 Onde está o item bank original (inglês)

| Fonte | Tipo | Conteúdo | Link |
|-------|------|----------|------|
| Site oficial Goldberg | HTML | Chave de facetas IPIP-NEO (300 itens) | [ipip.ori.org/newNEOFacetsKey.htm](https://ipip.ori.org/newNEOFacetsKey.htm) |
| Site Johnson (atual) | HTML | IPIP-NEO-120 e IPIP-NEO-300, instruções | [drj60472.virtualave.net/IPIP/index.html](https://drj60472.virtualave.net/IPIP/index.html) |
| Repo NeuroQuestAi | JSON | 120 itens canônicos numerados, MIT | [five-factor-e/data/IPIP-NEO/120/questions.json](https://github.com/NeuroQuestAi/five-factor-e/blob/main/data/IPIP-NEO/120/questions.json) |
| Repo rubynor | TS | 120 itens em estrutura Next.js, MIT, 859 stars | [bigfive-web/packages/questions](https://github.com/rubynor/bigfive-web) |

### 4.3 Versão PT-BR — o que está disponível e qualidade

A tradução PT-BR mais acessível e usada está em **`five-factor-e`** (já baixada para [fontes/big-five-ipip/ipip-neo-120-questions-pt-br.json](fontes/big-five-ipip/ipip-neo-120-questions-pt-br.json)).

**Amostra dos primeiros itens validados manualmente:**

| ID | EN | PT-BR (`five-factor-e`) | Naturalidade BR? |
|----|----|------------------------|------------------|
| 1 | Worry about things. | Me preocupo com as coisas. | ✅ PT-BR (não "Preocupo-me") |
| 2 | Make friends easily. | Faço amigos com facilidade. | ✅ Natural |
| 3 | Have a vivid imagination. | Tenho imaginação vívida. | ⚠️ "Vívida" é literário, considerar "viva" |
| 4 | Trust others. | Confio nas pessoas. | ✅ Natural |
| 5 | Complete tasks successfully. | Termino com sucesso aquilo que começo. | ✅ Natural |

**Avaliação rápida:** a tradução é **PT-BR genuíno** (sintaxe brasileira, não portuguesa europeia). Não tem trechos forçados ou anglicismos óbvios. Mas algumas escolhas lexicais merecem revisão por psicólogo BR:

- **Item 3 ("imaginação vívida")** — "vívida" é literário; "imaginação fértil/viva" seria mais natural.
- **Itens da faceta O6-Liberalism** (28, 58, 88, 118) — referências a "left-wing/right-wing" e "tradition" precisam de verificação cultural.
- **Itens da faceta C2-Orderliness** (10, 40, 70, 100) — verificar se "tidy/orderly" foi traduzido como "arrumado/organizado" (BR) ou "limpo/asseado" (que muda o sentido).

**Recomendação:** Antes de produção, fazer um **painel de 3-5 psicólogos BR** revisar os 120 itens em 1-2 horas. Custo baixo, mitigação de risco alta.

### 4.4 Como o item ID mapeia para faceta e domínio

A numeração canônica de Johnson 2014 segue uma fórmula determinística. Cada um dos 120 itens pertence a **exatamente uma das 30 facetas**, e o mapeamento é:

```
faceta_do_item(N) = ((N - 1) mod 30) + 1
```

**Exemplo:**
- Item 1 → faceta 1 (Anxiety / Domínio N)
- Item 31 → faceta 1 (Anxiety / Domínio N) — segundo item dessa faceta
- Item 61 → faceta 1 (Anxiety / Domínio N) — terceiro item
- Item 91 → faceta 1 (Anxiety / Domínio N) — quarto item

Cada faceta tem 4 itens. Cada domínio (O, C, E, A, N) tem 6 facetas × 4 itens = 24 itens por domínio.

**Ordem das 30 facetas (posições 1-30):**

| Pos | Faceta | Domínio | Itens |
|-----|--------|---------|-------|
| 1 | Anxiety (Ansiedade) | N | 1, 31, 61, 91 |
| 2 | Friendliness (Cordialidade) | E | 2, 32, 62, 92 |
| 3 | Imagination (Imaginação) | O | 3, 33, 63, 93 |
| 4 | Trust (Confiança) | A | 4, 34, 64, 94 |
| 5 | Self-Efficacy (Autoeficácia) | C | 5, 35, 65, 95 |
| 6 | Anger (Raiva) | N | 6, 36, 66, 96 |
| 7 | Gregariousness (Gregariedade) | E | 7, 37, 67, 97 |
| 8 | Artistic Interests (Interesses Artísticos) | O | 8, 38, 68, 98 |
| 9 | Morality (Moralidade) | A | 9, 39, 69, 99 |
| 10 | Orderliness (Organização) | C | 10, 40, 70, 100 |
| 11 | Depression (Depressão) | N | 11, 41, 71, 101 |
| 12 | Assertiveness (Assertividade) | E | 12, 42, 72, 102 |
| 13 | Emotionality (Emocionalidade) | O | 13, 43, 73, 103 |
| 14 | Altruism (Altruísmo) | A | 14, 44, 74, 104 |
| 15 | Dutifulness (Senso de Dever) | C | 15, 45, 75, 105 |
| 16 | Self-Consciousness (Auto-consciência) | N | 16, 46, 76, 106 |
| 17 | Activity Level (Nível de Atividade) | E | 17, 47, 77, 107 |
| 18 | Adventurousness (Aventureirismo) | O | 18, 48, 78, 108 |
| 19 | Cooperation (Cooperação) | A | 19, 49, 79, 109 |
| 20 | Achievement Striving (Realização) | C | 20, 50, 80, 110 |
| 21 | Immoderation (Imoderação) | N | 21, 51, 81, 111 |
| 22 | Excitement Seeking (Busca de Emoção) | E | 22, 52, 82, 112 |
| 23 | Intellect (Intelecto) | O | 23, 53, 83, 113 |
| 24 | Modesty (Modéstia) | A | 24, 54, 84, 114 |
| 25 | Self-Discipline (Autodisciplina) | C | 25, 55, 85, 115 |
| 26 | Vulnerability (Vulnerabilidade) | N | 26, 56, 86, 116 |
| 27 | Cheerfulness (Alegria) | E | 27, 57, 87, 117 |
| 28 | Liberalism (Liberalismo) | O | 28, 58, 88, 118 |
| 29 | Sympathy (Empatia) | A | 29, 59, 89, 119 |
| 30 | Cautiousness (Cautela) | C | 30, 60, 90, 120 |

---

<a id="5-scoring"></a>
## 5. ALGORITMO DE SCORING — JOHNSON 2014 + IMPLEMENTAÇÃO

### 5.1 Referência canônica

> Johnson, J. A. (2014). Measuring thirty facets of the five factor model with a 120-item public domain inventory: Development of the IPIP-NEO-120. _Journal of Research in Personality_, 51, 78–89. DOI: [10.1016/j.jrp.2014.05.003](https://doi.org/10.1016/j.jrp.2014.05.003)

**PDF não está em open access** (paywall Elsevier). Detalhes do algoritmo extraídos de:
- Código-fonte verificado de [`NeuroQuestAi/five-factor-e`](https://github.com/NeuroQuestAi/five-factor-e) (Python, MIT, **aprovado pelo próprio Dr. Johnson** segundo README).
- [Site oficial do Johnson](https://drj60472.virtualave.net/IPIP/index.html).
- [`rubynor/bigfive-web`](https://github.com/rubynor/bigfive-web) (TS/Next.js, 859 stars, MIT).

### 5.2 Escala de resposta

Likert de **1 a 5**:

| Valor | Inglês | PT-BR (sugerido) |
|-------|--------|------------------|
| 1 | Very Inaccurate | Muito imprecisa |
| 2 | Moderately Inaccurate | Moderadamente imprecisa |
| 3 | Neither Accurate Nor Inaccurate | Nem precisa nem imprecisa |
| 4 | Moderately Accurate | Moderadamente precisa |
| 5 | Very Accurate | Muito precisa |

### 5.3 Reverse-coded items

**55 dos 120 itens (46%) são reverse-coded.** Para esses, aplicar inversão antes de somar:

```
resposta_corrigida = 6 - resposta_original
```

**IDs exatos dos itens reversos no IPIP-NEO-120 (numeração canônica Johnson):**

| Domínio | Itens reversos | Total reverso | Total itens |
|---------|----------------|---------------|-------------|
| **N** (Neuroticismo) | 51, 81, 96, 101, 106, 111, 116 | 7 | 24 |
| **E** (Extroversão) | 62, 67, 92, 97, 102, 107 | 6 | 24 |
| **O** (Abertura) | 48, 53, 68, 73, 78, 83, 88, 98, 103, 108, 113, 118 | 12 | 24 |
| **A** (Amabilidade) | 9, 19, 24, 39, 49, 54, 69, 74, 79, 84, 89, 94, 99, 104, 109, 114, 119 | 17 | 24 |
| **C** (Conscienciosidade) | 30, 40, 60, 70, 75, 80, 85, 90, 100, 105, 110, 115, 120 | 13 | 24 |
| **TOTAL** | — | **55** | **120** |

### 5.4 Cálculo dos scores

**Passo 1 — Reverse:** aplicar `6 - resposta` para os 55 itens listados acima.

**Passo 2 — Score de faceta (raw):** somar as 4 respostas (corrigidas) de cada faceta. Range: 4–20.

**Passo 3 — Score de domínio (raw):** somar as 6 facetas do domínio. Range: 24–120.

**Passo 4 — T-score (normalizado):**
```
T = 50 + 10 × (raw - mean_norm) / sd_norm
```
Onde `mean_norm` e `sd_norm` vêm das **normas de Johnson** (estratificadas por sexo M/F/Neutro × 4 faixas etárias = 8 grupos).

**Passo 5 — Percentil (aproximação cúbica de Johnson):**
```
percentil = 210.336 - 16.738×T + 0.4059×T² - 0.002706×T³
```
Truncado entre 1 e 99.

**Passo 6 — Classificação qualitativa:**
- T < 45 → "baixo"
- 45 ≤ T ≤ 55 → "médio"
- T > 55 → "alto"

### 5.5 Pseudocódigo Python (reproducível)

```python
"""
IPIP-NEO-120 Scoring — Implementação baseada em Johnson 2014
Fonte: NeuroQuestAi/five-factor-e (MIT, aprovado pelo Dr. Johnson)
"""

REVERSED_ITEMS_120 = {
    # Neuroticismo
    51, 81, 96, 101, 106, 111, 116,
    # Extroversão
    62, 67, 92, 97, 102, 107,
    # Abertura
    48, 53, 68, 73, 78, 83, 88, 98, 103, 108, 113, 118,
    # Amabilidade
    9, 19, 24, 39, 49, 54, 69, 74, 79, 84, 89, 94, 99, 104, 109, 114, 119,
    # Conscienciosidade
    30, 40, 60, 70, 75, 80, 85, 90, 100, 105, 110, 115, 120,
}  # Total: 55 itens

FACET_TO_DOMAIN = {
    1:'N', 6:'N', 11:'N', 16:'N', 21:'N', 26:'N',
    2:'E', 7:'E', 12:'E', 17:'E', 22:'E', 27:'E',
    3:'O', 8:'O', 13:'O', 18:'O', 23:'O', 28:'O',
    4:'A', 9:'A', 14:'A', 19:'A', 24:'A', 29:'A',
    5:'C', 10:'C', 15:'C', 20:'C', 25:'C', 30:'C',
}

def reverse(score: int) -> int:
    return 6 - score

def facet_of_item(item_id: int) -> int:
    return ((item_id - 1) % 30) + 1

def percentile_from_t(t: float) -> float:
    """Aproximação cúbica derivada das normas de Johnson 2014."""
    pct = 210.335958661391 - (16.7379362643389 * t) \
        + (0.405936512733332 * t**2) \
        - (0.00270624341822222 * t**3)
    return max(1.0, min(99.0, pct))

def classify(t: float) -> str:
    if t < 45: return "baixo"
    if t > 55: return "alto"
    return "médio"

def score_ipip_neo_120(responses: dict, sex: str = 'N', age: int = 30, norms: dict = None) -> dict:
    """
    responses: {item_id (1-120): score (1-5)}
    sex: 'M', 'F', or 'N' (neutral/unknown)
    age: integer
    norms: dict com mean/sd por domínio e faceta para o grupo (sexo × faixa etária)
    """
    # 1. Reverse scoring
    corrected = {
        i: reverse(s) if i in REVERSED_ITEMS_120 else s
        for i, s in responses.items()
    }

    # 2. Facet scores (raw, range 4-20)
    facet_raw = {f: 0 for f in range(1, 31)}
    for item_id, val in corrected.items():
        facet_raw[facet_of_item(item_id)] += val

    # 3. Domain scores (raw, range 24-120)
    domain_raw = {'O':0, 'C':0, 'E':0, 'A':0, 'N':0}
    for f, val in facet_raw.items():
        domain_raw[FACET_TO_DOMAIN[f]] += val

    # 4-5-6. T-score, percentil, classificação
    norm = norms[select_norm_group(sex, age)]  # ver tabela em §5.6

    domains = {}
    for d in 'OCEAN':
        t = 50 + 10 * (domain_raw[d] - norm['domain'][d]['mean']) / norm['domain'][d]['sd']
        domains[d] = {
            'raw': domain_raw[d],
            't_score': round(t, 2),
            'percentile': round(percentile_from_t(t), 1),
            'level': classify(t),
        }

    facets = {}
    for f in range(1, 31):
        t = 50 + 10 * (facet_raw[f] - norm['facet'][f]['mean']) / norm['facet'][f]['sd']
        facets[f] = {
            'raw': facet_raw[f],
            't_score': round(t, 2),
            'level': classify(t),
        }

    return {'domains': domains, 'facets': facets}
```

### 5.6 Normas

**Normas de Johnson 2014 (default, internacionais):**
- N > 619.000 respondentes online
- Estratificadas por **sexo** (M/F/N) e **faixa etária** (<21, 21-40, 41-60, >60)
- Total: 8 grupos × 5 médias domínio + 5 SDs domínio + 30 médias faceta + 30 SDs faceta = **560 valores**
- Embutidas em `five-factor-e/ipipneo/norm.py` (open source)

**Normas brasileiras: NÃO EXISTEM publicadas.**

**Estratégia recomendada:**
1. **Fase 1 (lançamento):** usar normas de Johnson com aviso UI ("comparado com amostra normativa internacional, ainda sem normas brasileiras").
2. **Fase 2 (após n≥300 brasileiros):** calcular normas internas brasileiras estratificadas por sexo/idade. Documentar como "norma interna [empresa]".
3. **Fase 3 (n≥1000):** considerar publicar paper de adaptação BR — contribuição científica que valida o instrumento e diferencia o produto.

### 5.7 Output recomendado para o ATS

Para cada candidato, retornar **3 níveis de granularidade**:

```json
{
  "candidate_id": "abc123",
  "completed_at": "2026-04-27T14:32:00Z",
  "instrument": "IPIP-NEO-120 PT-BR (five-factor-e)",
  "norms": "Johnson 2014 (international, n=619k+)",
  "summary": {
    "openness":          {"raw": 87, "t": 56.3, "pct": 73, "level": "alto"},
    "conscientiousness": {"raw": 95, "t": 61.2, "pct": 86, "level": "alto"},
    "extraversion":      {"raw": 72, "t": 48.1, "pct": 42, "level": "médio"},
    "agreeableness":     {"raw": 88, "t": 54.7, "pct": 67, "level": "médio"},
    "neuroticism":       {"raw": 60, "t": 44.5, "pct": 28, "level": "baixo"}
  },
  "facets": {
    "1": {"name": "Ansiedade", "domain": "N", "raw": 12, "t": 45.0, "level": "médio"},
    "...": "..."
  }
}
```

**No frontend (UI para gestor leigo):** mostrar **apenas os 5 domínios** com texto qualitativo curto. Guardar as 30 facetas no banco para análise futura ou para psicólogo organizacional.

---

<a id="6-cfp"></a>
## 6. RISCO CFP/SATEPSI — VEREDITO JURÍDICO

### 6.1 O que diz a Resolução CFP 31/2022

Vigente desde fev/2023, revoga a 09/2018 (que revogou a 002/2003).

**Art. 10 — definição de teste psicológico:**

> _"Considera-se Teste Psicológico o instrumento que identifica, descreve, qualifica e mensura características psicológicas por meio de procedimentos sistemáticos de observação e descrição do comportamento humano, nas suas diversas formas de expressão, **acordados pela comunidade científica**."_

A resolução enumera o que se enquadra como teste: **testes, escalas, inventários, questionários, métodos projetivos e expressivos**. Renomear o instrumento (ex: "questionário de perfil") **não escapa** do enquadramento.

**Art. 8º — quem pode aplicar:**

> _"O uso profissional dos testes psicológicos é privativo da psicóloga e do psicólogo, conforme estabelece o art. 13, da Lei 4.119, de 27 de agosto de 1962."_

PDF integral salvo em [fontes/big-five-ipip/CFP-Resolucao-31-2022-testes-psicologicos.pdf](fontes/big-five-ipip/CFP-Resolucao-31-2022-testes-psicologicos.pdf).

### 6.2 SATEPSI — o IPIP-NEO-120 não consta

Big Five aprovados na lista oficial [satepsi.cfp.org.br/Lista_Teste_Completa.cfm](https://satepsi.cfp.org.br/Lista_Teste_Completa.cfm):

| Instrumento | Aprovação | Vigência | Vendor |
|-------------|-----------|----------|--------|
| **NEO PI-R** | 11/04/2008 | 15 anos = expirado em 2023 (verificar renovação) | Vetor |
| **NEO FFI-R** | 11/04/2008 | 15 anos = expirado em 2023 (verificar renovação) | Vetor |
| **BFP** (Bateria Fatorial de Personalidade) | 01/08/2009 | Renovado, vigente até 25/10/2039 | Pearson |

**IPIP-NEO-120 nunca foi submetido ao SATEPSI.** Logo, não tem o status formal de "teste psicológico aprovado". Mas o critério da Res. 31/2022 (Art. 10) **independe da aprovação SATEPSI** — o que define o instrumento como teste psicológico é a natureza (mede características psicológicas sistematicamente), não o cadastro.

### 6.3 Posição oficial do CFP sobre uso por não-psicólogos

[Nota Técnica do SATEPSI](https://satepsi.cfp.org.br/docs/notaTecnica.pdf) (PDF salvo em [fontes/big-five-ipip/CFP-NotaTecnica-SATEPSI-DISC-PAT-PI.pdf](fontes/big-five-ipip/CFP-NotaTecnica-SATEPSI-DISC-PAT-PI.pdf)):

> _"O Conselho Federal de Psicologia tem ciência de que o DISC, o PAT e o PI [Predictive Index] são utilizados em processos de seleção sem autorização do sistema Conselhos de Psicologia. (...) o procedimento adotado é encaminhar as informações para a Polícia Federal, além de representações éticas considerando o uso ilegal e/ou irregular de teste psicológico."_

**Tradução prática:** se a empresa for denunciada (concorrente, ex-funcionário, candidato rejeitado, sindicato), o CFP encaminha para Polícia Federal por **contravenção penal** (Art. 47, Lei 3.688/1941 — exercício ilegal da profissão).

### 6.4 ADI 3481/STF — não muda nada para o uso

Em 05/03/2021, o STF (7×4) declarou inconstitucional a restrição de venda de testes a não-psicólogos. Mas o CFP esclareceu imediatamente:

> _"A decisão se restringe à questão comercialização. **Outros profissionais, mesmo que adquiram os testes, não poderão utilizá-los para fins de diagnóstico psicológico, orientação e seleção profissional**, pois isto continua caracterizando exercício ilegal da profissão."_

### 6.5 Aplicação online sem psicólogo — proibida

A **Resolução CFP 09/2024** (vigente desde 31/08/2024) regula serviços via TDICs (Tecnologias Digitais). Pontos:

- Testes online exigem **parecer favorável SATEPSI específico para a modalidade remota** — aprovação papel ≠ aprovação online.
- **"Aplicação informatizada" (mediada por computador) ≠ "aplicação online" (acesso remoto/à distância).**
- Em qualquer modalidade, exige psicólogo responsável tecnicamente.

**Conclusão:** não há nenhuma resolução CFP que permita aplicação online de teste psicológico **sem psicólogo responsável** — nem em modelo auto-aplicado.

### 6.6 Análise do cenário-base do projeto

| Cenário | Auto-aplicado | Gestor lê resultado | Score afeta decisão | Sem psicólogo | Risco |
|---------|---------------|---------------------|---------------------|---------------|-------|
| **Como descrito no briefing** | ✅ | ✅ | ✅ (mesmo "como contexto") | ✅ | **🔴 ALTO** |

**Três frentes de risco concretas:**

**Frente 1 — Exercício ilegal de função privativa**
- Base: Art. 8º Res. CFP 31/2022 + Art. 13 Lei 4.119/1962 + Decreto 53.464/1964
- Tipificação: contravenção penal (Art. 47 Lei 3.688/1941)
- Pena: prisão simples 15 dias-3 meses ou multa
- Procedimento CFP: representação ao CRP estadual + encaminhamento à PF

**Frente 2 — Discriminação trabalhista**
- Base: Lei 9.029/1995 (proíbe práticas discriminatórias na admissão)
- Precedente: TRT-2/SP invalidou processo seletivo com filtro MBTI
- Penalidade: dano moral coletivo + readmissão + multa administrativa (até 10× maior salário)

**Frente 3 — LGPD**
- Base: Lei 13.709/2018 — perfil de personalidade ≠ dado sensível listado, mas a Justiça do Trabalho tem tratado como categoria que exige base legal robusta
- Risco: não atendimento aos princípios de necessidade, finalidade e adequação
- Penalidade: até R$ 50M ou 2% do faturamento por infração

### 6.7 Estratégias de mitigação — o que muda cada uma

| Estratégia | Reduz risco? | Custo |
|------------|--------------|-------|
| Renomear "questionário de perfil comportamental" | ❌ Marginal — Art. 10 inclui "questionário" expressamente | ~R$ 0 |
| Disclaimer "não é teste psicológico" | ⚠️ Frágil — natureza define enquadramento, não declaração | ~R$ 0 |
| Remover interpretação psicológica do output (apenas raw scores) | ⚠️ Reduz aparência de diagnóstico, não remove ato de aplicar | ~R$ 0 |
| **Resultado entregue só ao candidato (não ao gestor)** | ✅ **Alto** — afasta finalidade de "orientação e seleção profissional" | Médio (UX redesign) |
| **Desvincular score da decisão de contratação** (documentado + técnico) | ✅ **Alto** — afasta enquadramento como "fator de seleção" | Médio (process redesign) |
| **Psicólogo organizacional como responsável técnico** (consultoria) | ✅ **Muito alto** — legaliza o instrumento sob CRP ativo | R$ 2-5k/mês |
| Trocar para SATEPSI (BFP/NEO FFI-R) + psicólogo | ✅ **Máximo** — compliance total | R$ 18-38/aplicação + custo psicólogo |

### 6.8 Veredito jurídico final

**O cenário "auto-aplicado, gestor lê resultado, score influencia decisão, sem psicólogo" é juridicamente inviável no Brasil.**

**Caminhos viáveis (do mais para o menos arriscado):**

1. ✅ **Ferramenta de auto-conhecimento entregue ao candidato.** Score só vai para o candidato (relatório dele para uso pessoal). Empresa não armazena nem usa para decisão. Funciona como "brinde de candidatura". Risco: **muito baixo**. Limitação: não atende ao objetivo do projeto (gestor receber contexto).

2. ✅ **Reposicionamento + psicólogo responsável técnico.** Instrumento é apresentado como "self-assessment de estilo de trabalho" + psicólogo CRP ativo é contratado como consultor (mesmo regime hora-técnica) e assina parecer técnico. Empresa documenta: (a) score não é fator decisório; (b) score é insumo qualitativo entregue junto com candidatura; (c) responsável técnico psicólogo. Risco: **baixo a médio**. Custo: R$ 2-5k/mês.

3. ⚠️ **Adoção de instrumento SATEPSI + psicólogo + cobrança por aplicação.** BFP via Pearson ou NEO FFI-R via Vetor. Risco: **mínimo**. Custo: R$ 18-38/candidato + psicólogo. Modelo de negócio diferente (precisa repassar custo ao cliente da plataforma).

4. ❌ **IPIP-NEO-120 puro, sem psicólogo, gestor recebe score.** Risco: **alto**. Não recomendar.

---

<a id="7-plan-b"></a>
## 7. PLAN B PRIORIZADO

### 7.1 Decision matrix completa

| # | Instrumento | Itens | Tempo | Licença | SATEPSI | Validação BR | Veredito |
|---|-------------|-------|-------|---------|---------|--------------|----------|
| 1 | **IPIP-NEO-120** | 120 | 20-30 min | Domínio público | ❌ | Tradução sem validação | Referência |
| 2 | **BFI-2** (60 itens) | 60 | 12-15 min | Acadêmico (Berkeley) | ❌ | ✅ [Pires 2023, n=908](https://www.scielo.br/j/pusf/a/Qm7Gct4nXsfVJY6mcPjv3DC/) | **Plan B #1** |
| 3 | **HEXACO-60** | 60 | 12-15 min | Acadêmico (hexaco.org) | ❌ | ✅ [Lima 2019, n=397](https://doi.org/10.1016/j.paid.2019.05.039) | **Plan B #2 (diferencial)** |
| 4 | **BFI-2-S** (30 itens) | 30 | 6-8 min | Acadêmico | ❌ | Derivado | Plan B MVP |
| 5 | **Mini-IPIP** | 20 | 4-5 min | Domínio público | ❌ | PT (Oliveira 2019); BR ausente | Contingência rápida |
| 6 | **IGFP-5** (Andrade 2008) | 44 | 8-10 min | Tese aberta | ❌ | ✅ n=5.089 | Triagem populacional |
| 7 | **TIPI** | 10 | 1-2 min | Domínio público | ❌ | ✅ n=113 (piloto) | Inadequado individual |
| 8 | **BFP** | 126 | 30 min | Pearson (R$ 22-25) | ✅ | ✅ n=6.599 | Compliance máximo, custo alto |
| 9 | **NEO FFI-R** | 60 | 15-20 min | Vetor (R$ 18-38) | ✅ | ✅ n=1.353 | Compliance máximo |
| 10 | **DISC/Sólides** | ~40 | 7 min | SaaS proprietário | ❌ (declarado) | ❌ peer-review | Descartar |
| 11 | **Predictive Index** | 86 | 6-8 min | USD 4.950+/ano | ❌ | ❌ | Descartar (custo) |
| 12 | **Hogan HPI** | 206 | 15-20 min | Praendex BR | ❌ | ❌ | Descartar |

### 7.2 Plan B #1: BFI-2 (Soto & John 2017, validado BR 2023)

**Por quê é o melhor Plan B.**

- **Validação BR publicada:** [Pires, Nunes, Nunes & Primi (2023). Preliminary validity for the Big Five Inventory-2 in Brazilian adults. _Psicologia: Ciência e Profissão_](https://www.scielo.br/j/pusf/a/Qm7Gct4nXsfVJY6mcPjv3DC/) — n=908, CFA + ESEM, α 0.82-0.90, CFI=0.94, RMSEA=0.03. PDF salvo em [fontes/big-five-ipip/Pires-2023-BFI-2-validacao-PT-BR.pdf](fontes/big-five-ipip/Pires-2023-BFI-2-validacao-PT-BR.pdf).
- **Estrutura:** 60 itens, 5 domínios, **15 facetas** (vs 30 no IPIP-NEO-120 — redução manejável).
- **Tempo:** 12-15 min — adequado para ATS.
- **Licença:** copyright Soto & John (Berkeley); **gratuito para pesquisa não-comercial** via OSF [osf.io/4a8cf](https://osf.io/4a8cf/). Uso comercial em ATS exige email a Christopher Soto (Colby College) ou Oliver John (Berkeley) — histórico mostra resposta favorável para usos não-clínicos.
- **Trade-off vs IPIP-NEO-120:** ganha validação BR formal e estudo psicométrico recente; perde domínio público total e 15 facetas a menos.

**Quando usar:** se o time priorizar **rigor científico publicado + tempo curto** sobre **autonomia total de licença**.

### 7.3 Plan B #2: HEXACO-60 (com diferencial Honesty-Humility)

**Por quê é estratégico para clínica odontológica.**

- **Validação BR:** [Lima, Hauck-Filho & Faiad (2019). Honesty-Humility and the HEXACO structure: A psychometric investigation in Brazil. _Personality and Individual Differences_](https://doi.org/10.1016/j.paid.2019.05.039) — n=397, EFA confirma 6 fatores, correlações com BFI adequadas.
- **Estrutura:** 60 itens, **6 domínios** — Honestidade-Humildade, Emocionalidade, Extroversão, Amabilidade, Conscienciosidade, Abertura.
- **Diferencial:** O fator **Honesty-Humility (H)** prediz comportamentos antiéticos, fraude, absenteísmo por fingimento e furto no trabalho. Para clínicas de saúde — onde confiança paciente-profissional é central — esse fator tem **valor incremental sobre o Big Five tradicional**.
- **Licença:** gratuito para pesquisa via [hexaco.org](http://hexaco.org/); uso comercial exige contato com Ashton & Lee. Restrição técnica: dados online devem estar em servidor protegido por senha (não indexado).
- **Trade-off:** menos conhecido no mercado BR; 6 fatores exigem painel de interpretação adicional no UI.

**Quando usar:** se o time quiser **diferenciação competitiva** apostando no fator H como predizer de fit em saúde.

### 7.4 Plan B #3: Mini-IPIP (contingência ultra-rápida)

**Por quê é a contingência.**

- **Domínio público total** (família IPIP).
- **20 itens, 4-5 minutos.**
- Validação PT publicada (Oliveira 2019, Portugal); validação BR canônica não encontrada — **risco psicométrico aceitável apenas para MVP**.
- α 0.65–0.77 — adequado para rastreio populacional, **não para análise individual de personalidade rica**.
- 5 fatores apenas, **sem facetas**.

**Quando usar:** apenas se o produto precisar de algo **funcionando hoje** com burocracia zero. Migrar para BFI-2 ou IPIP-NEO-120 assim que possível.

### 7.5 Cenário-mapa de decisão

| Cenário do projeto | Instrumento recomendado |
|--------------------|-------------------------|
| Risco CFP baixo aceitável + autonomia comercial total + 30 facetas + tempo ≤20 min | **IPIP-NEO-120** (com painel BR de revisão de itens + piloto n=300) |
| Rigor científico publicado é mais importante que autonomia + 15 facetas suficiente | **BFI-2** (com licença formal Soto/John) |
| Diferencial competitivo "ética/integridade" no setor saúde | **HEXACO-60** |
| Compliance CFP máximo (com psicólogo no time) | **BFP** (Pearson, R$ 22+/aplicação) |
| MVP sem burocracia, lançar hoje | **Mini-IPIP** (com aviso de limitação psicométrica) |
| Pesquisa interna agregada (não individual) | **TIPI** ou **IGFP-5** |

---

<a id="8-recomendacao"></a>
## 8. RECOMENDAÇÃO EXECUTIVA — 3 CENÁRIOS

### Cenário A — Conservador (compliance máximo, custo aceitável)

**Use:** **BFP via Pearson** + psicólogo organizacional consultor.

- Instrumento SATEPSI aprovado, vigente até 2039.
- Psicólogo CRP ativo como responsável técnico (R$ 2-5k/mês de consultoria).
- Custo: R$ 22-25 por candidato × volume.
- Risco: **mínimo**.
- Modelo de negócio: repassar custo ao cliente da plataforma ATS (clínica).
- Tempo de implementação: 4-6 semanas.

### Cenário B — Pragmático (recomendado)

**Use:** **BFI-2 PT-BR** (Pires 2023) + reposicionamento como auto-conhecimento + psicólogo consultor.

**Stack:**
1. Instrumento: BFI-2 (60 itens, 12-15 min, validação BR 2023 publicada).
2. Licença: email formal a Christopher Soto/Oliver John pedindo permissão para uso comercial não-clínico em ATS. Justificar como "uso de informação suplementar de auto-conhecimento, não-eliminatório, sem laudo psicológico". Resposta esperada: positiva.
3. Reposicionamento UI: chamar de "Self-assessment de estilo de trabalho" — não "teste psicológico".
4. **Resultado entregue ao candidato como relatório próprio** + opção do candidato compartilhar com a clínica voluntariamente.
5. Psicólogo organizacional CRP ativo como responsável técnico (consultoria mensal).
6. Documentação técnica e jurídica clara: instrumento NÃO é fator de eliminação; gestor recebe como contexto qualitativo, não score numérico.
7. LGPD: consentimento específico, finalidade explícita, base legal "interesse legítimo" + "execução de contrato preliminar".

**Custo de uso:** R$ 0 por aplicação (após licença). Custo de psicólogo: R$ 2-5k/mês.

**Risco:** **baixo a médio**.

### Cenário C — Audacioso (autonomia máxima, risco gerenciado)

**Use:** **IPIP-NEO-120 PT-BR** (`five-factor-e`) + revisão de itens por painel BR + piloto + psicólogo consultor.

**Stack:**
1. Instrumento: IPIP-NEO-120 PT-BR do `five-factor-e` (já em [fontes/big-five-ipip/ipip-neo-120-questions-pt-br.json](fontes/big-five-ipip/ipip-neo-120-questions-pt-br.json)).
2. **Painel de 3-5 psicólogos BR** revisa os 120 itens em 1-2 horas (custo R$ 1-3k). Foco: O6-Liberalism (28, 58, 88, 118), C2-Orderliness (10, 40, 70, 100), itens com lexicalmente forçados.
3. **Piloto n≥300** (funcionários atuais + candidatos pré-launch) → calcular alfas de Cronbach por traço e por faceta, EFA exploratória. Se algum traço ficar α < 0.70, revisar itens específicos.
4. **Normas internas brasileiras** após n≥300 — substituir normas Johnson 2014 por normas próprias.
5. Reposicionamento UI: "Self-assessment de estilo de trabalho" (idêntico ao Cenário B).
6. **Resultado entregue ao candidato** como insight pessoal + opção de compartilhar.
7. Psicólogo organizacional CRP ativo como responsável técnico.
8. **30 facetas** disponíveis no banco para análise futura/relatórios premium do produto.

**Custo de uso:** R$ 0 por aplicação. **Custo único:** painel R$ 1-3k + piloto operacional R$ 2-5k. **Custo recorrente:** psicólogo R$ 2-5k/mês.

**Risco:** **médio** — depende fortemente da qualidade da execução das mitigações (especialmente reposicionamento + responsável técnico).

**Vantagem competitiva:** o produto tem **autonomia total de licença** (sem dependência de Berkeley ou de Pearson), pode escalar sem custo marginal por aplicação, e oferece **30 facetas** — diferencial real sobre BFI-2 (15 facetas) e BFP (14 facetas).

### Recomendação final

**Cenário B** é o melhor equilíbrio risco/custo/rigor para a fase atual do projeto.

**Cenário C** é estrategicamente superior para o longo prazo (autonomia, custo marginal zero, 30 facetas) mas exige investimento upfront em validação interna (~R$ 5-10k em piloto + revisão).

**Cenário A** apenas se houver exigência hard de compliance SATEPSI vinda do cliente final (improvável em rede de clínicas odontológicas privadas).

---

<a id="9-implementacao"></a>
## 9. IMPLEMENTAÇÃO CONCRETA NO ATS

### 9.1 Arquitetura sugerida (Cenário B ou C)

```
┌────────────────────────────────────────────────────────┐
│  Frontend (Next.js)                                    │
│  - Apresenta termo de consentimento LGPD               │
│  - Aplica os N itens (Likert 1-5, item por tela)       │
│  - Mostra progresso, tempo restante                    │
│  - Salva respostas parciais (resume on refresh)        │
└──────────────────────┬─────────────────────────────────┘
                       │ POST /api/assessment/submit
                       ▼
┌────────────────────────────────────────────────────────┐
│  Backend API (Next.js Server / Edge Function)          │
│  - Valida integridade (todos os 120 itens respondidos) │
│  - Detecta padrões suspeitos (random clicking, etc)    │
│  - Chama scorer                                        │
└──────────────────────┬─────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────┐
│  Scorer (Python microservice OU TypeScript inline)     │
│  - Aplica reverse scoring                              │
│  - Calcula 30 facets + 5 domains                       │
│  - Aplica normas (Johnson 2014 ou internas)            │
│  - Retorna T-score + percentil + nível qualitativo     │
└──────────────────────┬─────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────┐
│  Database (Postgres / Supabase)                        │
│  - Tabela: candidate_assessments                       │
│  - Tabela: assessment_responses (raw, audit trail)     │
│  - Tabela: assessment_scores (raw, t, pct, level)      │
│  - LGPD: TTL de 6-12 meses pós-rejeição/contratação    │
└──────────────────────┬─────────────────────────────────┘
                       │
                       ├─→ Email candidato (relatório PDF)
                       │
                       └─→ Dashboard gestor (qualitativo,
                           sem score numérico, com aviso
                           "não é fator de seleção")
```

### 9.2 Stack técnica recomendada

| Camada | Tech | Por quê |
|--------|------|---------|
| **Item bank** | JSON estático | [fontes/big-five-ipip/ipip-neo-120-questions-pt-br.json](fontes/big-five-ipip/ipip-neo-120-questions-pt-br.json) já pronto |
| **Frontend** | Next.js 15+ | Já é stack do ATS (presumido) |
| **Scorer (Opção 1)** | Python microservice usando `pip install five-factor-e` | Aprovado por Johnson, normas embutidas |
| **Scorer (Opção 2)** | TypeScript port (~150 linhas) | Sem deploy adicional, scoring inline |
| **DB** | Supabase/Postgres | Standard ATS |
| **PDF report** | React-PDF ou puppeteer | Relatório candidato |

**Recomendação:** começar com Opção 1 (Python via `five-factor-e`) por ter normas embutidas e ser referência canônica. Migrar para TS port depois se latência for problema.

### 9.3 Build vs Buy

**Build:** estimativa 4-6 semanas para um senior full-stack:
- 1 sem: item bank + UI de aplicação (120 itens × Likert)
- 1 sem: scorer (Python ou TS)
- 1 sem: relatório candidato (PDF)
- 1 sem: dashboard gestor (qualitativo, conforme compliance)
- 1-2 sem: revisão jurídica + ajustes LGPD + textos de consentimento + UAT

**Buy:** não há vendor SaaS BR de IPIP-NEO-120. Os SaaS comerciais (Sólides, Pandapé, etc) usam DISC ou MBTI proprietários. Para Big Five com IPIP, precisaria integrar [`bigfive-web`](https://github.com/rubynor/bigfive-web) (859 stars, MIT, self-host) — viável mas é build customizado.

### 9.4 Compliance LGPD — checklist mínimo

- [ ] Termo de consentimento específico mencionando: instrumento usado, finalidade, retenção, direitos do titular, contato DPO
- [ ] Base legal documentada (recomendação: "execução de contrato preliminar" Art. 7º, V LGPD + "interesse legítimo" Art. 7º, IX)
- [ ] Possibilidade de candidato **revogar** consentimento a qualquer momento
- [ ] Possibilidade de candidato **acessar** seus dados completos
- [ ] Possibilidade de candidato **excluir** seus dados completos
- [ ] **TTL automático:** 6 meses pós-rejeição (default LGPD), 12 meses pós-contratação se relevante
- [ ] **Anonimização** de respostas usadas para construção de normas internas (sem PII)
- [ ] **DPO designado** + canal de contato visível no termo

### 9.5 Compliance CFP — checklist mínimo

- [ ] Instrumento NÃO chamado de "teste psicológico" no UI
- [ ] **Resultado entregue ao candidato** como relatório dele (não só ao gestor)
- [ ] Disclaimer no relatório: "Esta ferramenta é um self-assessment de estilo de trabalho. Não constitui avaliação psicológica e não substitui parecer profissional."
- [ ] **Score NÃO usado como fator de eliminação** no funil — documentado em código e em política
- [ ] **Psicólogo CRP ativo** como responsável técnico (consultoria mínima)
- [ ] Documentação interna de que o produto **não é teste psicológico** (memorando técnico-jurídico)
- [ ] Política de uso para gestores: receber resultado **apenas como contexto qualitativo**, não score numérico

---

<a id="10-gaps"></a>
## 10. GAPS E PRÓXIMOS PASSOS

### 10.1 Gaps identificados

1. **Validação BR formal do IPIP-NEO-120 inexiste.** O campo precisa de paper de validação BR. Oportunidade: o time pode publicar essa validação após o piloto (n≥300), criando contribuição científica e diferencial de marketing.

2. **Status atual de NEO PI-R/NEO FFI-R no SATEPSI** após expiração 2023 — verificar com Vetor/SATEPSI se houve renovação.

3. **Licença comercial BFI-2 e HEXACO** — não há preço público. Necessita contato direto com Soto/John (Colby/Berkeley) e Ashton/Lee (Brock/Calgary). Histórico sugere resposta positiva, mas formalizar antes do go-live.

4. **Normas brasileiras populacionais para qualquer Big Five** — não há base normativa BR pública para nenhum Big Five não-comercial. BFP tem normas internas Pearson (não públicas). Oportunidade científica e comercial.

5. **Precedente judicial específico empresa privada × IPIP/Big Five sem psicólogo** — não encontrado. Precedentes existentes são DISC/MBTI/concursos públicos. Significa: risco existe mas é não-testado em tribunal para o cenário-base. Não é razão para descartar mitigações.

6. **HEXACO em clínica odontológica** — fator H tem validade incremental teoricamente sólida para profissionais de saúde, mas não há estudo específico no contexto. Lacuna empírica.

### 10.2 Próximos passos imediatos (sequência executável)

**Semana 1-2 (decisão de instrumento):**
- [ ] Decidir entre Cenário A/B/C com stakeholders (CTO, jurídico, psicólogo consultor se já contratado)
- [ ] Se Cenário B: enviar email a Christopher Soto e Oliver John pedindo licença comercial não-clínica para BFI-2 BR em ATS
- [ ] Se Cenário C: contratar painel de 3-5 psicólogos BR para revisar 120 itens em 1-2 horas

**Semana 3-4 (preparação técnica):**
- [ ] Implementar scorer (Python via `five-factor-e` OR TS port)
- [ ] Implementar UI de aplicação dos itens
- [ ] Implementar relatório candidato (PDF)
- [ ] Implementar dashboard gestor (qualitativo, sem score numérico)
- [ ] Revisão jurídica completa: textos de consentimento, política, memo técnico-jurídico

**Semana 5-6 (piloto interno):**
- [ ] Aplicar em funcionários atuais (n=50-100) → primeira sanidade dos itens
- [ ] Coletar feedback qualitativo (itens que confundiram, tempo gasto)
- [ ] Ajustes finais

**Semana 7-8 (piloto externo):**
- [ ] Lançar com candidatos reais em 1-2 clínicas piloto
- [ ] Monitorar: completion rate, tempo médio, distribuição de scores
- [ ] Coletar feedback de gestores sobre utilidade do contexto

**Mês 3-6 (consolidação):**
- [ ] Após n≥300 brasileiros: calcular normas internas BR
- [ ] Calcular alfa de Cronbach por traço e faceta — se α < 0.70 em algum, revisar itens
- [ ] Considerar publicar paper de adaptação BR (contribuição científica + marketing)

### 10.3 KPIs de qualidade do instrumento (para monitorar pós-launch)

| Métrica | Threshold mínimo | Threshold ideal |
|---------|------------------|-----------------|
| Completion rate (candidato termina os 120 itens) | ≥ 75% | ≥ 90% |
| Tempo médio | 15-25 min | 18-22 min |
| α de Cronbach por traço | ≥ 0.70 | ≥ 0.80 |
| α de Cronbach por faceta | ≥ 0.50 | ≥ 0.65 |
| Detecção de respostas inválidas (random clicking, straight-lining) | ≥ 95% precision | ≥ 98% |
| NPS do candidato sobre o relatório próprio | ≥ 30 | ≥ 50 |

---

<a id="11-fontes"></a>
## 11. FONTES TIERADAS

### Tier 1 — Essenciais (todo membro do time deve conhecer)

1. **Johnson, J. A. (2014).** Measuring thirty facets of the five factor model with a 120-item public domain inventory. _Journal of Research in Personality_, 51, 78–89. **DOI:** [10.1016/j.jrp.2014.05.003](https://doi.org/10.1016/j.jrp.2014.05.003) — paper canônico do IPIP-NEO-120 (paywall).

2. **Site oficial IPIP / Goldberg.** [ipip.ori.org](https://ipip.ori.org/) — política de domínio público + chave de facetas.

3. **Site oficial Johnson (IPIP-NEO).** [drj60472.virtualave.net/IPIP/index.html](https://drj60472.virtualave.net/IPIP/index.html) — instruções, item bank, novo host desde jul/2023.

4. **NeuroQuestAi/five-factor-e** (Python/MIT, aprovado por Johnson). [github.com/NeuroQuestAi/five-factor-e](https://github.com/NeuroQuestAi/five-factor-e) — implementação canônica de scoring com normas embutidas.

5. **rubynor/bigfive-web** (TS/Next.js/MIT, 859 stars). [github.com/rubynor/bigfive-web](https://github.com/rubynor/bigfive-web) — referência de implementação web do IPIP-NEO-120.

6. **Resolução CFP 31/2022.** [PDF salvo](fontes/big-five-ipip/CFP-Resolucao-31-2022-testes-psicologicos.pdf) | [atosoficiais.com.br/cfp/resolucao-31-2022](https://atosoficiais.com.br/cfp/resolucao-do-exercicio-profissional-n-31-2022) — define teste psicológico, restringe uso a psicólogos.

7. **Pires, J. G., Nunes, C. H. S. S., Nunes, M. F. O. & Primi, R. (2023).** Preliminary validity for the Big Five Inventory-2 in Brazilian adults. _Psicologia: Ciência e Profissão_. [SciELO](https://www.scielo.br/j/pusf/a/Qm7Gct4nXsfVJY6mcPjv3DC/) | [PDF salvo](fontes/big-five-ipip/Pires-2023-BFI-2-validacao-PT-BR.pdf) — validação BR do BFI-2, n=908.

8. **SATEPSI — Sistema de Avaliação de Testes Psicológicos.** [satepsi.cfp.org.br/Lista_Teste_Completa.cfm](https://satepsi.cfp.org.br/Lista_Teste_Completa.cfm) — lista oficial de testes aprovados pelo CFP.

9. **Nota Técnica CFP sobre DISC/PAT/PI.** [PDF salvo](fontes/big-five-ipip/CFP-NotaTecnica-SATEPSI-DISC-PAT-PI.pdf) | [satepsi.cfp.org.br/docs/notaTecnica.pdf](https://satepsi.cfp.org.br/docs/notaTecnica.pdf) — posição oficial CFP sobre uso por não-psicólogos.

### Tier 2 — Complementares (validação BR + alternativas)

10. **Andrade, J. M. (2008).** Evidências de validade do inventário dos cinco grandes fatores de personalidade para o Brasil (IGFP-5). Tese UnB. [Repositório UnB](https://repositorio.unb.br/handle/10482/1751) | [PDF salvo](fontes/big-five-ipip/Andrade-2008-IGFP-5-tese-UnB.pdf) — n=5.089, BFI-44 PT-BR.

11. **Hutz, C. S., Nunes, C. H., Silveira, A. D., Serra, J., Anton, M., & Wieczorek, L. S. (1998).** O desenvolvimento de marcadores para a avaliação da personalidade no modelo dos cinco grandes fatores. _Psicologia: Reflexão e Crítica_. [SciELO](http://www.scielo.br/j/prc/a/4bMcTZHDcV8S3dsZQjSWL3L/).

12. **Laros, J. A., Peres, A. J. S., Andrade, J. M. & Passos, M. F. D. (2018).** Validity evidence of two short scales measuring the Big Five personality factors. _Psicologia: Reflexão e Crítica_. [SciELO](https://www.scielo.br/j/prc/a/FcFYSkP468sbXQWnbVPKJxg/) | [PDF salvo](fontes/big-five-ipip/Laros-2018-escalas-reduzidas-Big-Five.pdf).

13. **Roiz Junior et al. (2023).** Psychometric properties of the Brazilian version of the Big Five Inventory (BFI-25). _Trends in Psychiatry and Psychotherapy_. [SciELO](https://www.scielo.br/j/trends/a/WZ3swRY784fzxSZWXc6ZYQf/) | [PDF salvo](fontes/big-five-ipip/Roiz-2023-BFI-25-PT-BR.pdf).

14. **Palhano, D. B., Andrade, J. M. & Moraes, R. M. (2023).** Elaboração e Evidências de Validade do IACGF-F. _Interação em Psicologia_ (UFPB/UnB). [revistas.ufpr.br/psicologia/article/view/85447](https://revistas.ufpr.br/psicologia/article/view/85447) — instrumento BR nativo com facetas.

15. **Lima, R. F. F., Hauck-Filho, N., & Faiad, C. (2019).** Honesty-Humility and the HEXACO structure: A psychometric investigation in Brazil. _Personality and Individual Differences_. [DOI](https://doi.org/10.1016/j.paid.2019.05.039) — adaptação HEXACO BR, n=397.

16. **Soto, C. J., & John, O. P. (2017).** The next Big Five Inventory (BFI-2). _Journal of Personality and Social Psychology_, 113, 117–143. — paper original BFI-2.

17. **Bateria Fatorial de Personalidade (BFP) — Hogrefe Brasil.** [hogrefe.com.br/bateria-fatorial-de-personalidade](https://hogrefe.com.br/bateria-fatorial-de-personalidade.html) — instrumento BR nativo, SATEPSI aprovado, n=6.599.

18. **Resolução CFP 09/2024** (online psychology). [site.cfp.org.br](https://site.cfp.org.br/) — regulação de TDICs, exige psicólogo responsável.

19. **Lei 4.119/1962.** Cria a profissão de psicólogo. Art. 13 reserva orientação e seleção profissional a psicólogos.

20. **Lei 9.029/1995.** Proíbe práticas discriminatórias na admissão — base para invalidação de processos seletivos com filtros de personalidade.

### Tier 3 — Referência (consulta futura)

21. **Lima & Simões (2014).** A versão portuguesa do NEO-FFI (PT-PT). [revista.appsicologia.org](https://revista.appsicologia.org/index.php/rpsicologia/article/download/534/702/2309/1000) — para diferenciar PT-PT vs PT-BR.

22. **Gomes & Gjikuria (2017).** Comparando ESEM e CFA para Big Five. _Avaliação Psicológica_ (IBAP). [submission-pepsic.scielo.br/avp/12118](https://submission-pepsic.scielo.br/index.php/avp/article/view/12118) — base metodológica para futura validação.

23. **Passos & Laros (2015).** Construção de escala reduzida de Cinco Grandes Fatores. _Avaliação Psicológica_. [PePSIC](https://pepsic.bvsalud.org/scielo.php?script=sci_arttext&pid=S1677-04712015000100014).

24. **Donnellan, M. B., Oswald, F. L., Baird, B. M., & Lucas, R. E. (2006).** The Mini-IPIP scales. _Psychological Assessment_, 18, 192–203.

25. **Gosling, S. D., Rentfrow, P. J., & Swann, W. B., Jr. (2003).** A very brief measure of the Big-Five personality domains (TIPI). _Journal of Research in Personality_.

26. **ADI 3481/STF (2021).** Decisão sobre venda de testes psicológicos a leigos.

27. **Decreto 53.464/1964.** Regulamenta a profissão de psicólogo.

28. **Sackett, P. R., Zhang, C., Berry, C. M., & Lievens, F. (2022).** Revisiting meta-analytic estimates of validity in personnel selection. _Journal of Applied Psychology_. [PubMed 34968080](https://pubmed.ncbi.nlm.nih.gov/34968080/) — base para a posição da pesquisa-mãe sobre validade modesta de personalidade (rho=.19 para Conscienciosidade).

---

## 12. ANEXOS

### Anexo A — Arquivos baixados em [fontes/big-five-ipip/](fontes/big-five-ipip/)

| Arquivo | Tipo | Tamanho | Conteúdo |
|---------|------|---------|----------|
| `ipip-neo-120-questions-en.json` | JSON | 10 KB | 120 itens originais EN do IPIP-NEO-120 (Johnson 2014) |
| `ipip-neo-120-questions-pt-br.json` | JSON | 10 KB | 120 itens PT-BR (`five-factor-e`, tradução não-validada) |
| `Pires-2023-BFI-2-validacao-PT-BR.pdf` | PDF | 309 KB | Validação BR do BFI-2 (n=908) — SciELO OA |
| `Andrade-2008-IGFP-5-tese-UnB.pdf` | PDF | 842 KB | Tese de adaptação BR do BFI-44 (n=5.089) |
| `Laros-2018-escalas-reduzidas-Big-Five.pdf` | PDF | 503 KB | Validação de escalas reduzidas Big Five PT-BR |
| `Roiz-2023-BFI-25-PT-BR.pdf` | PDF | 226 KB | Validação BFI-25 PT-BR Nordeste BR (n=490) |
| `CFP-Resolucao-31-2022-testes-psicologicos.pdf` | PDF | 182 KB | Texto integral da Resolução CFP 31/2022 |
| `CFP-NotaTecnica-SATEPSI-DISC-PAT-PI.pdf` | PDF | 262 KB | Posição oficial CFP sobre uso por não-psicólogos |

### Anexo B — Email-template para Soto & John (Cenário B)

```
Subject: Permission request — BFI-2 use in HR assessment platform

Dear Dr. Soto / Dr. John,

I'm writing to request permission to use the Brazilian Portuguese
version of the BFI-2 (validated by Pires, Nunes, Nunes & Primi, 2023,
Psicologia: Ciência e Profissão) in our applicant tracking system
for a network of dental clinics in Brazil.

Use details:
- Format: 60-item online self-assessment
- Purpose: behavioral context information delivered to the candidate
  as a personal report; NOT used as elimination criterion in selection
- No clinical interpretation, no diagnosis
- Responses kept confidential, retention per LGPD (Brazilian GDPR)
- Estimated volume: ~500 candidates/month
- Commercial product (paid SaaS for dental clinic owners)
- Psychologist (registered with Brazilian Psychology Council, CRP)
  acts as technical responsible
- Citation of Soto & John (2017) and Pires et al. (2023) prominently
  displayed

Would you be willing to grant permission for this use? If so, please
indicate any conditions, attribution requirements, or licensing fees.

We're committed to using the BFI-2 in a manner consistent with its
scientific validity and ethical use.

Best regards,
[Name], [Title]
[Company], Brazil
```

### Anexo C — Tradução PT-BR sugerida da escala Likert

| EN (Johnson) | PT-BR sugerido |
|--------------|----------------|
| Very Inaccurate | Muito imprecisa |
| Moderately Inaccurate | Moderadamente imprecisa |
| Neither Accurate Nor Inaccurate | Nem precisa nem imprecisa |
| Moderately Accurate | Moderadamente precisa |
| Very Accurate | Muito precisa |

Texto introdutório PT-BR sugerido para o candidato (adaptado de Johnson):

> _"Descreva-se com sinceridade. Tente avaliar como você é, e não como gostaria de ser. Considere como você se vê em comparação com outras pessoas que conhece, do mesmo sexo e idade aproximada. Para cada afirmação, escolha a resposta que melhor descreve quão precisamente ela se aplica a você. Não há respostas certas ou erradas — só descrições mais ou menos precisas de você."_

---

## 13. HISTÓRICO

### 2026-04-27 (compilação inicial — Deep Research autônomo agendado às 04:00 BRT)

**Subagentes Sonnet executados:**
- Subagente A — IPIP-NEO PT-BR Validation (n=12 fontes Tier 1-2)
- Subagente B — Item Bank + Scoring (n=15 fontes técnicas + 2 repos GitHub)
- Subagente C — CFP/SATEPSI Compliance (n=10 fontes regulatórias + jurisprudência)
- Subagente D — Plan B Alternativas (n=12 instrumentos avaliados)

**Total de fontes consultadas:** ~50.
**Fontes baixadas localmente:** 6 PDFs + 2 JSONs (item bank EN + PT-BR).
**Modo de execução:** Deep Research autônomo agendado via `CronCreate` (one-shot), pasta de trabalho [pesquisas/sistema-avaliacao-candidatos-recrutamento/](.).

**Decisão fundamental:** o IPIP-NEO-120 é tecnicamente viável (domínio público, item bank PT-BR existe, scoring é bem documentado) mas o cenário-base do briefing (auto-aplicado, gestor lê, score afeta decisão, sem psicólogo) é juridicamente inviável no Brasil. A pesquisa identificou 3 cenários executáveis (A: BFP+psicólogo; B: BFI-2+reposicionamento+psicólogo; C: IPIP-NEO-120+painel BR+piloto+psicólogo) e recomenda o **Cenário B** como melhor equilíbrio risco/custo/rigor.
