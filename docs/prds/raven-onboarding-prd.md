> # ⛔ DEPRECATED (2026-06-05)
>
> **Este PRD está aposentado.** O Raven foi descartado em definitivo (SATEPSI-desfavorável desde 2023 + licença Pearson inviável + adverse impact d=1.0). O ICAR60, que era seu substituto recomendado (cenário A), **também foi descartado** pela Deep Research #1 (licença non-commercial + zero validação PT-BR + fora SATEPSI + sem normas BR).
>
> **Substituído por:** [`m2-funil-rh/PRD-cognitivo-raciocinio.md`](./m2-funil-rh/PRD-cognitivo-raciocinio.md) — prova técnica de raciocínio lógico (itens CC0), online, não-psicológica, contextual no funil de **seleção** (não onboarding).
>
> **O escopo de "cognitivo no onboarding pós-contratação"** está fora do M2 (ver §3b do Master) e fica para um milestone futuro de desenvolvimento de pessoas, se houver.
>
> ⚠️ **Ação P0 ainda válida (independe deste PRD):** auditar git history por imagens Raven legadas (`src/assets/images/raven/`) e rodar `git filter-repo` se necessário (ver §5.4 / RL-08 abaixo). As imagens já foram removidas do working tree.
>
> ---

# Mini-PRD: Raven no Onboarding (Pós-Contratação)

**Autor:** Fernando Costa | **Data:** 2026-04-19 | **Status:** ⛔ DEPRECATED (era: Draft pendente decisão legal crítica)
**Upstream:** `docs/prds/PRD-MASTER-sistema-recrutamento.md` §10.3.1
**Irmãos:** `docs/prds/cognitivo-icar-prd.md` (seleção), `docs/prds/bigfive-prd.md`, `docs/prds/disc-prd.md`, `docs/prds/fit-cultural-prd.md`

> **AVISO VERMELHO (ler antes de qualquer código):** A pesquisa deste PRD revelou que **Raven's Progressive Matrices está com parecer DESFAVORÁVEL no SATEPSI** (desde 2023, por estudos de normatização vencidos conforme Resolução CFP nº 31/2022). Isso significa que **o uso por psicólogos registrados no Brasil constitui infração ética** — e reforça a dúvida sobre seu uso fora de contexto avaliativo. Este PRD documenta o caminho adiante com **trava de bloqueio**: nenhuma linha de código deste módulo deve ser escrita até que (a) a auditoria das imagens legadas seja concluída e (b) a consulta jurídica/psicológica externa confirme o caminho escolhido. Ver §4, §14 e §15.

---

## Sumário

1. [Papel no Sistema — NÃO é seleção; é desenvolvimento](#1-papel-no-sistema--não-é-seleção-é-desenvolvimento)
2. [Por que Raven e não ICAR aqui?](#2-por-que-raven-e-não-icar-aqui)
3. [Licenciamento Raven](#3-licenciamento-raven)
4. [Status Legal de Uso em Onboarding](#4-status-legal-de-uso-em-onboarding)
5. [Auditoria das Imagens Legadas](#5-auditoria-das-imagens-legadas)
6. [Formato de Aplicação (se Raven aprovado)](#6-formato-de-aplicação-se-raven-aprovado)
7. [Cálculo de Score e Interpretação](#7-cálculo-de-score-e-interpretação)
8. [Modelo de Dados (SEPARADO de seleção)](#8-modelo-de-dados-separado-de-seleção)
9. [UX Detalhada](#9-ux-detalhada)
10. [Devolutiva ao Funcionário](#10-devolutiva-ao-funcionário)
11. [Visualização pelo RH/Gestor](#11-visualização-pelo-rhgestor)
12. [Consentimento e Direito de Recusar](#12-consentimento-e-direito-de-recusar)
13. [LGPD](#13-lgpd)
14. [Gaps e Decisões Pendentes](#14-gaps-e-decisões-pendentes)
15. [Riscos Legais Residuais](#15-riscos-legais-residuais)
16. [Referências](#16-referências)

---

## 1. Papel no Sistema — NÃO é seleção; é desenvolvimento

O Raven **NÃO participa do pipeline de seleção** da Beauty Smile. No pipeline seletivo, o instrumento cognitivo é o **ICAR Matrix Reasoning** (ver `cognitivo-icar-prd.md`), justamente porque o ICAR é open-access, fora do SATEPSI, e tem status legal mais claro para uso não-psicológico.

**Posicionamento do Raven:**

- O candidato **já foi aprovado, contratou-se e assinou contrato** antes de ver este módulo.
- A oferta do Raven acontece apenas **dentro dos primeiros 30 dias de onboarding**.
- A participação é **estritamente voluntária** — recusa não tem qualquer efeito na relação de trabalho.
- O objetivo é construir um **baseline cognitivo individual** para:
  1. Alimentar um plano de desenvolvimento pessoal (PDI).
  2. Informar decisões de rotação/alocação interna (ex: dentista em clínica especializada vs. generalista).
  3. Oferecer autoconhecimento ao próprio funcionário.
- **Proibido usar os resultados para:** demitir, promover, aumentar/reduzir salário, avaliação de desempenho formal, ranking comparativo entre funcionários.

**Decisão explícita:** o Raven existe neste sistema apenas porque o cliente solicitou e já há imagens legadas no repositório. Caso a auditoria (§5) ou a consulta legal (§14) invalidem qualquer uma das premissas abaixo, o módulo inteiro deve ser **substituído** por uma das alternativas listadas em §3 (BOMAT, Matrix-24 open-access) ou simplesmente **removido**.

---

## 2. Por que Raven e não ICAR aqui?

### 2.1 ICAR foi a escolha correta para seleção

Na seleção, o ICAR foi escolhido porque:
- Tem licença open-access (Creative Commons), evitando qualquer disputa de copyright.
- Está **fora do SATEPSI** — não é "teste psicológico regulamentado" no Brasil, o que reduz a necessidade de psicólogo registrado.
- É curto (11 itens típicos), cabendo em uma etapa assíncrona do processo seletivo sem cansar o candidato.

### 2.2 Trade-off para uso em desenvolvimento

No onboarding, os critérios mudam:
- **Granularidade:** o Raven Standard tem 60 itens (vs. 11 do ICAR mínimo), permitindo um perfil cognitivo mais fino — útil para um PDI de 6-12 meses.
- **Validade ecológica:** Raven tem décadas de literatura empírica, com normas por escolaridade, idade, país. ICAR é mais recente e tem menos normas brasileiras publicadas.
- **Familiaridade institucional:** psicólogos brasileiros reconhecem Raven; ICAR ainda é exótico em contextos corporativos BR.

### 2.3 Por que a troca é inaceitável em seleção mas aceitável em onboarding

O que muda é o **enquadramento legal**:
- Em **seleção**, o teste pode ser lido como "avaliação para decisão de emprego" (Art. 11 LGPD + Resolução CFP 31/2022 + Lei 4.119/1962) — um terreno onde SATEPSI/CFP têm jurisdição plena.
- Em **onboarding pós-contratação**, se estruturado como "ferramenta de desenvolvimento voluntária" (sem devolução de decisão de emprego, sem relatório contratual, sem comparação entre funcionários), o terreno regulatório é mais cinza.

> **Mas veja o aviso vermelho no topo:** mesmo esse terreno cinza pode não ser suficiente, dado que o Raven está DESFAVORÁVEL no SATEPSI. Ver §4 e §15.

### 2.4 Alternativa preferida se houver qualquer dúvida residual

Se as questões abertas de §14 não fecharem em **verde** até o início da Fase 9.5, a recomendação técnica deste PRD é **substituir Raven por matrizes open-access** (mesmo formato visual, mesma mecânica, sem risco de copyright nem de SATEPSI). Ver §3.4.

---

## 3. Licenciamento Raven

### 3.1 Versões existentes

| Versão | Descrição | Público | Itens | Tempo típico |
|---|---|---|---|---|
| **SPM (Standard Progressive Matrices)** | Versão clássica, cinza, itens A-E | 6 anos até adultos | 60 | 45-60 min |
| **SPM+ / SPM Plus** | Versão revisada, itens mais difíceis | Adultos | 60 | 45 min |
| **CPM (Coloured Progressive Matrices)** | Versão colorida, mais fácil | Crianças (5-11) e idosos | 36 | 15-30 min |
| **APM (Advanced Progressive Matrices III)** | Itens avançados | Adultos de alta capacidade | 23-36 | 40-60 min |
| **Raven's 2** | Versão mais nova, publicada pela Pearson | Ampla (2018+) | Variável | 20-45 min |

Para onboarding corporativo, a versão mais comum seria **SPM** ou **Raven's 2** (adulta geral).

### 3.2 Detentor de direitos

Os direitos comerciais das versões oficiais pertencem a **Pearson Education / Pearson Assessments** (marca **Pearson TalentLens** para uso corporativo, **Pearson Clinical** para uso clínico). No Brasil, o licenciamento é feito via **Pearson Clinical Brasil** (pearsonclinical.com.br) e pelas revendas autorizadas (Sinopsys, Vetor, Casa do Psicólogo).

"Raven's Standard Progressive Matrices™" é marca registrada. Cópias não licenciadas — em qualquer mídia, digital ou impressa — violam direito autoral e marca.

### 3.3 Custos estimados para licença comercial (indicativo, confirmar direto com Pearson)

- **Kit físico clínico** (caderno + crivo + bloco de respostas): R$ 400–900 por unidade no varejo brasileiro.
- **Licença corporativa Pearson TalentLens / Raven's Adaptive:** não divulgado publicamente — exige cotação. Tipicamente:
  - Modelo por aplicação: US$ 15–50 por candidato.
  - Modelo por volume anual: 4-5 dígitos USD/ano dependendo do seating.
  - Plataforma online Pearson (obrigatória em contratos corporativos em muitos casos) — integração via link/redirect, sem embedding fácil em um app próprio.
- **Integração técnica:** Pearson geralmente **não licencia os itens visuais** para embedding em aplicação de terceiros. O fluxo esperado é redirecionar o usuário para o portal Pearson, que aplica o teste e devolve um relatório. Isso **incompatibiliza com a arquitetura atual** (itens visuais dentro do app Beauty Smile, submissão nativa).

**Conclusão desta subseção:** licenciar Raven nos moldes da arquitetura pretendida (itens servidos de bucket próprio, submissão dentro do app) **provavelmente não é viável** — Pearson não licencia desse jeito. O caminho pearson típico é redirecionamento.

### 3.4 Alternativas open-access (recomendadas)

Se o cliente não aceitar redirect para plataforma Pearson, as alternativas realistas são:

| Instrumento | Licença | Origem | Adequado para onboarding? |
|---|---|---|---|
| **ICAR Matrix Reasoning (subset 16+)** | Creative Commons (icar-project.com) | Condon & Revelle, 2014 | **Sim** — mesma mecânica, mais curto. Já escolhido para seleção; pode-se usar **outro subset** no onboarding para evitar sobreposição. |
| **ICAR60 (bateria completa)** | Creative Commons | SAPA Project | **Sim** — mais granular, aproxima do escopo do Raven SPM. Recomendação primária deste PRD. |
| **Matrix-24 / Open Matrices** | Public domain / CC | Múltiplos autores | **Sim** — 24 matrizes com normas publicadas em literatura internacional. |
| **BOMAT (Bochumer Matrizentest)** | Comercial (Hogrefe) | Alemanha, traduzido no Brasil | Tecnicamente parecido com Raven, mas **entra no SATEPSI** (status atual: favorável até 2030 em algumas edições, checar). Não resolve o problema CFP. |
| **Teste de Matrizes de Atenção (Hogrefe)** | Comercial | Brasil | Escopo diferente (atenção, não raciocínio fluido). Não substitui Raven. |

**Recomendação primária:** **ICAR60** (um subset específico de 30-60 itens, diferente do subset usado em seleção, para evitar memorização entre candidato→funcionário). Custo zero, licença clara, nenhum conflito com SATEPSI (ICAR não está na lista de testes psicológicos regulamentados do CFP — é uma bateria de pesquisa aberta).

---

## 4. Status Legal de Uso em Onboarding

### 4.1 O que SATEPSI regula

A Resolução CFP nº 31/2022 (que revogou a 009/2018, que havia revogado a 002/2003) define:
- **Avaliação Psicológica** é atividade **privativa de psicólogo** registrado em CRP ativo.
- Testes **aprovados no SATEPSI** são obrigatórios como fontes fundamentais e complementares de informação quando há avaliação psicológica.
- **Testes desfavoráveis no SATEPSI não podem ser usados por psicólogos** em atividade profissional — constituem infração ética (Art. 1º do Código de Ética Profissional do Psicólogo).

**Status atual do Raven no SATEPSI:** segundo a lista pública de testes desfavoráveis (satepsi.cfp.org.br/testesDesfavoraveis.cfm), as **Matrizes Progressivas de Raven** constam como DESFAVORÁVEIS desde a revisão associada à Resolução 31/2022, por estudos de normatização vencidos. **Consulta obrigatória ao site antes da implementação** — o status pode mudar.

### 4.2 A pergunta central: isso se aplica a uso não-avaliativo?

O CFP regula o **exercício profissional da psicologia**. O Art. 13 da Lei 4.119/1962 restringe a aplicação e interpretação de testes psicológicos a psicólogos. A Resolução 31/2022 define avaliação psicológica como "processo estruturado de investigação de fenômenos psicológicos **para prover informações à tomada de decisão**".

Interpretações possíveis:

1. **Interpretação restritiva (pró-CFP):** qualquer aplicação de um instrumento identificado como "teste psicológico" por um leigo constitui exercício ilegal da profissão. Sob essa leitura, o cliente Beauty Smile **não pode** aplicar Raven em onboarding mesmo sendo voluntário e sem decisão de emprego, se fizer sem psicólogo.

2. **Interpretação funcional (pró-empresa):** se não há avaliação (no sentido técnico de gerar laudo/decisão), mas apenas uma ferramenta de autoconhecimento/desenvolvimento apresentada como tal, o uso pode estar fora do escopo regulado. Esta é a tese de algumas consultorias corporativas que aplicam MBTI, DISC, e similares sem psicólogo.

**Não há jurisprudência TST consolidada** especificamente sobre Raven em onboarding. A Súmula Vinculante 44 do STF trata de **concurso público** e exige lei para psicotécnico — não se aplica diretamente a emprego privado.

### 4.3 Risco adicional: o Raven está desfavorável

Mesmo que a interpretação funcional (pró-empresa) prevaleça, usar um teste que o próprio CFP classificou como tecnicamente desfavorável adiciona risco reputacional e técnico:
- Resultados não têm normas brasileiras atualizadas.
- Qualquer devolutiva baseada em percentis será questionável cientificamente.
- Se um funcionário processar alegando uso indevido, o contra-argumento "mas você usou um teste que nem o CFP aceita mais" agrava o caso.

### 4.4 Recomendação técnica deste PRD

| Cenário | Decisão |
|---|---|
| **A — Cliente aceita usar ICAR60 em vez de Raven** | ✅ **Seguir em frente.** Implementar o módulo "onboarding cognitivo" com ICAR60. Baixo risco legal, sem copyright, sem SATEPSI. |
| **B — Cliente quer Raven e pode licenciar via Pearson (redirect)** | ⚠️ Aceitável apenas se Pearson oferecer modalidade online corporativa + se supervisor psicólogo pontual for contratado para devolutiva. |
| **C — Cliente quer Raven dentro do app (embedded)** | 🚫 **Bloquear.** Inviável por copyright (Pearson) + inviável por SATEPSI (desfavorável) + inviável sem psicólogo. |
| **D — Cliente insiste em Raven sem psicólogo nem licença** | 🚫 **Bloquear e documentar recusa.** Risco inaceitável. |

**Recomendação forte:** cenário **A**. O Raven neste produto, na prática, vai ser ICAR60 com interface similar. Para o funcionário, o "look and feel" é equivalente (matrizes progressivas). Para o jurídico, muda tudo.

### 4.5 Supervisor técnico pontual (se cenário B)

Mesmo usando Raven licenciado, a aplicação/interpretação **deveria** ter acompanhamento psicológico para cobrir o flanco ético. Opções:
- **Consultor externo autônomo** (psicólogo com CRP ativo, PJ ou RPA): contratado pontualmente para (i) validar o fluxo uma vez, (ii) revisar o template de devolutiva, (iii) estar disponível para dúvidas técnicas. Custo estimado: 8-20h de consultoria inicial (R$ 3-8k) + mensalidade de plantão (R$ 1-2k/mês).
- **Psicólogo parceiro formal** com contrato de responsabilidade técnica: exige contratação regular, mesmo que PJ. Essa é a opção mais robusta; o cliente declarou não querer isso.

O cliente decidiu **não** contratar psicólogo CFP. Se esse ponto não mudar, **o cenário B também fica inviável** e cai-se no cenário A.

---

## 5. Auditoria das Imagens Legadas

### 5.1 O que existe hoje no repositório

- Diretório: `src/assets/images/raven/` com **62 arquivos .webp** (A1-A12, B1-B12, C1-C12, D1-D12, E1-E12).
- Script: `src/copiar-imagens-raven.sh` com:
  ```
  ORIGEM="/Users/fernando/Downloads/Vendas/Transcricao/Teste/images2"
  DESTINO="assets/images/raven"
  ```
- O script espera **exatamente 60 imagens** (`if [ $TOTAL -eq 60 ]`).

### 5.2 Inferências sobre a origem

Os nomes A1-E12 correspondem **exatamente** à estrutura de itens do **Raven's Standard Progressive Matrices** (5 séries A, B, C, D, E × 12 itens cada = 60 itens). Isso, combinado com:
- O caminho de origem contém "Transcricao/Teste" — sugestivo de material extraído de uma fonte terceira (livro, PDF escaneado, kit comprado).
- A ausência de qualquer arquivo de licença, manual ou documentação da fonte.

**Conclusão técnica:** com altíssima probabilidade, as imagens são **cópias não licenciadas do Raven SPM publicado pela Pearson**. A pasta de origem sugere extração (scan OCR / conversão de PDF) do material físico.

### 5.3 Risco

| Risco | Severidade | Probabilidade |
|---|---|---|
| Violação de copyright Pearson (reprodução não autorizada de obra protegida) | Alta (danos morais + danos materiais + cessação imediata) | Alta se houver fiscalização ou denúncia |
| Violação de marca registrada ("Raven's Standard Progressive Matrices™") | Média-alta | Média |
| Uso de material desfavorável no SATEPSI com aparência de "teste psicológico oficial" | Média (ético + regulatório) | Média |
| Imagens permanecem em commits do repositório (mesmo após deleção) | Baixa técnica / alta jurídica (git history) | 100% se não houver rewrite) |

### 5.4 Plano de ação (BLOQUEADOR da implementação)

**Ação imediata (antes de qualquer código deste módulo):**

1. **Deletar** todo o conteúdo de `src/assets/images/raven/`.
2. **Deletar** o script `src/copiar-imagens-raven.sh`.
3. **Reescrita de histórico git** (BFG Repo-Cleaner ou `git filter-repo`) para remover os arquivos de **todos** os commits anteriores — importante porque até então o repositório distribui material potencialmente infrator a qualquer desenvolvedor que faz `git clone`.
4. **Documentar a deleção** num commit com mensagem clara: `chore(legal): remove legacy Raven assets pending license audit — see raven-onboarding-prd.md §5`.
5. **Notificar** qualquer desenvolvedor com fork/clone local que deve reclonar.
6. **Se cenário A (ICAR60)**: gerar os assets do ICAR60 a partir das fontes abertas do projeto ICAR (icar-project.com) com atribuição no README.
7. **Se cenário B (Raven licenciado)**: aguardar a licença Pearson e usar **apenas** os assets fornecidos pela Pearson, com os metadados de licença commitados junto.

**Prioridade:** P0. Este é o único item deste PRD que deve ser executado **independentemente** da decisão sobre o módulo. Mesmo que o módulo seja descartado, as imagens não podem ficar no repositório.

---

## 6. Formato de Aplicação (se Raven aprovado)

> Esta seção assume o cenário B (Raven licenciado com redirect Pearson). Se cenário A (ICAR60), substituir "Raven SPM" por "ICAR60" e ajustar contagem de itens de 60 para ~30-60 conforme subset escolhido.

### 6.1 Versão

- **Raven Standard Progressive Matrices (SPM)** — séries A, B, C, D, E (60 itens).
- Alternativamente **Raven's 2** se o licenciamento Pearson favorecer a versão nova.
- **NÃO** usar APM (muito difícil para população mista) nem CPM (desenhado para crianças).

### 6.2 Tempo

- **Sem timer rígido** por item — diferença-chave do uso em seleção.
- **Tempo máximo de sessão:** 90 minutos (soft cap com pausa voluntária).
- **Salvamento incremental** a cada item respondido — funcionário pode pausar e retomar.
- Exibir "tempo decorrido" (não contagem regressiva) como informação, não como pressão.

### 6.3 Dispositivo

- **Desktop/laptop preferencial** — matrizes exigem resolução suficiente para ver detalhes.
- **Mobile suportado mas não recomendado** — se o funcionário insistir, avisar que a acuidade pode ser comprometida.
- Responsive: imagens sempre renderizadas em tamanho natural com zoom opcional.

### 6.4 Ambiente

- Aviso na tela inicial: "Reserve um momento sem interrupções, em um ambiente silencioso. Você pode pausar se precisar."
- **Sem tela cheia forçada** (diferente de seleção). O funcionário pode navegar livremente.
- **Sem monitoramento** de foco de janela, tempo por item, padrões de resposta. Isso é desenvolvimento, não vigilância.

### 6.5 Ordem dos itens

- Ordem canônica do SPM (A1 → E12). Não randomizar — a progressão de dificuldade é parte do design do instrumento.
- Alternativas dentro de cada item **não** randomizadas (também parte do design original).

---

## 7. Cálculo de Score e Interpretação

### 7.1 Score bruto

- Total de acertos (0-60). Cada item tem **uma** resposta correta.
- Tabela de gabarito armazenada em `configuracao_instrumento` (tabela genérica do sistema).

### 7.2 Conversão para percentil

- **Norma a definir no mini-PRD finalizado:**
  - Opção 1: norma internacional Raven original (mais antiga).
  - Opção 2: adaptações brasileiras publicadas em literatura (Angelini et al., Pasquali, outras). Nenhuma aprovada atualmente no SATEPSI.
  - Opção 3 (pragmática para uso não-avaliativo): apresentar **apenas o score bruto** e uma classificação qualitativa de 5 faixas ("abaixo da média", "média", "acima da média" etc.) calculada internamente — sem chamar de "percentil".
- **Recomendação:** opção 3, para evitar aparência de avaliação psicométrica formal.

### 7.3 Output gravado

```json
{
  "versao_instrumento": "SPM-2024",
  "data_aplicacao": "2026-05-15T10:30:00Z",
  "tempo_total_ms": 2_340_000,
  "respostas": [
    {"item": "A1", "escolhida": 4, "correta": true, "tempo_ms": 18000},
    {"item": "A2", "escolhida": 2, "correta": false, "tempo_ms": 22000}
  ],
  "score_bruto": 47,
  "score_faixa": "acima_da_media",
  "narrativa_qualitativa": "forte em raciocinio visual analogico; pode beneficiar-se de treinamento em X"
}
```

### 7.4 Interpretação

- **Não é ranking.** Nunca ordenar funcionários por score.
- **Não é diagnóstico.** O sistema não gera "laudo" nem "parecer" — esses termos são reservados à psicologia.
- **É insumo para conversa.** O output alimenta uma devolutiva (§10) onde o funcionário + gestor discutem que aspectos do trabalho podem se beneficiar de treinamento/rotação.

### 7.5 Narrativa qualitativa

O texto livre em `narrativa_qualitativa` pode ser:
- Gerado por template estático com base em faixas (recomendação inicial).
- Gerado por LLM com prompt que **proíbe explicitamente** linguagem diagnóstica ("excelente QI", "aptidão superior" etc.) e obriga foco em ação ("recomenda-se exposição a situações de X").
- Revisado por psicólogo consultor antes de ir para o funcionário (ver §10).

---

## 8. Modelo de Dados (SEPARADO de seleção)

### 8.1 Tabela principal

```sql
CREATE TABLE onboarding_raven (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
  data_convite timestamptz NOT NULL DEFAULT now(),
  data_aceite timestamptz,
  data_inicio timestamptz,
  data_conclusao timestamptz,
  status text NOT NULL DEFAULT 'convidado'
    CHECK (status IN ('convidado','recusado','em_andamento','concluido','excluido_pelo_funcionario')),
  versao_instrumento text NOT NULL,           -- 'SPM-2024' ou 'ICAR60-subset-B' dependendo do cenário
  respostas_json jsonb,                        -- array de respostas item-a-item (ver §7.3)
  score_json jsonb,                            -- score_bruto, score_faixa, narrativa
  consentimento_lgpd_id uuid REFERENCES consentimentos_lgpd(id),
  observacoes_funcionario text,                -- campo aberto opcional
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_onboarding_raven_funcionario ON onboarding_raven(funcionario_id);
CREATE INDEX idx_onboarding_raven_status ON onboarding_raven(status);
```

### 8.2 Relações críticas

- **NÃO vincula a `candidaturas`** — vincula a `funcionarios` (tabela criada quando candidato aprovado vira funcionário; atualmente inexistente no schema, dependência deste PRD).
- **NÃO vincula a `scores_candidato`** (tabela de scores de seleção) — total separação de domínios.
- **Vincula a `consentimentos_lgpd`** — um registro de consentimento por aplicação.

### 8.3 RLS (Row Level Security)

```sql
-- Funcionário só vê o próprio registro
CREATE POLICY onboarding_raven_owner ON onboarding_raven
  FOR ALL USING (funcionario_id IN (
    SELECT id FROM funcionarios WHERE user_id = auth.uid()
  ));

-- RH e gestor direto do funcionário podem ler (não modificar respostas)
CREATE POLICY onboarding_raven_rh_read ON onboarding_raven
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('rh','admin'))
  );
```

### 8.4 Storage bucket

- Bucket novo: `raven-imagens-onboarding` (ou `icar60-imagens-onboarding` no cenário A).
- **Separado do bucket de seleção** (`icar-imagens`) — evita cross-contamination de material licenciado.
- Acesso: apenas funcionários ativos autenticados. Política Supabase Storage:
  ```sql
  CREATE POLICY raven_images_read ON storage.objects
    FOR SELECT USING (
      bucket_id = 'raven-imagens-onboarding'
      AND auth.uid() IN (SELECT user_id FROM funcionarios WHERE status = 'ativo')
    );
  ```

### 8.5 Retenção e deleção

- Gatilho de trigger: ao funcionário solicitar deleção (LGPD Art. 18 IV), atualizar `status = 'excluido_pelo_funcionario'` e **zerar** `respostas_json` e `score_json`. Preservar `data_convite`, `data_aceite` e o ID para fins de auditoria.
- Retenção máxima automática: **2 anos** após `data_conclusao`. Após isso, mesmo tratamento da deleção.
- Dump anual de dados em produção **não inclui** `respostas_json` nem `score_json` — apenas metadados agregados.

---

## 9. UX Detalhada

### 9.1 Tela 1 — Convite (Dia 7-15 do onboarding)

- **Aparição:** notificação no painel do funcionário, e-mail paralelo.
- **Tom:** convite, não cobrança. Headline: "Uma ferramenta opcional para conhecer seu perfil cognitivo."
- **CTAs:** "Quero saber mais" (vai para tela 2) / "Não, obrigado" (registra recusa, sem pergunta de motivo).
- **Componente:** `OnboardingRavenInvite.tsx`.

### 9.2 Tela 2 — Explicação do propósito

- Conteúdo obrigatório (bullet list, linguagem simples):
  - "Este é um exercício de matrizes visuais. Leva 30-60 minutos."
  - "Os resultados são **seus**. Você pode compartilhar com o gestor na devolutiva."
  - "Isto **NÃO** é avaliação de desempenho."
  - "Isto **NÃO** será usado em decisões de promoção, aumento, demissão ou avaliação formal."
  - "Você pode recusar agora ou desistir no meio do exercício — sem qualquer consequência."
  - "Você pode solicitar a exclusão dos resultados a qualquer momento."
- CTAs: "Aceitar e continuar" (vai para tela 3) / "Não, obrigado" (registra recusa).

### 9.3 Tela 3 — Consentimento LGPD específico

- Formulário com **três checkboxes obrigatórios**:
  - [ ] "Li e entendi o propósito deste exercício (item anterior)."
  - [ ] "Consinto com o processamento dos meus dados de desempenho neste exercício, classificados como **dados sensíveis** sob a LGPD, exclusivamente para a finalidade de desenvolvimento individual descrita acima."
  - [ ] "Entendo que posso revogar este consentimento e solicitar a exclusão dos dados a qualquer momento."
- Botão "Começar" só habilita com os três marcados.
- O consentimento gera um registro em `consentimentos_lgpd` com timestamp, IP, user agent.

### 9.4 Telas 4-N — Itens progressivos

- Um item por tela. Barra de progresso ("12 de 60").
- Botões: "Voltar" (permitido), "Próximo" (só após escolha), "Salvar e sair" (parar e retomar depois).
- Sem timer visível de item; timer total de sessão informativo.
- Auto-save a cada resposta.

### 9.5 Tela Final — Confirmação e devolutiva

- "Exercício concluído. Seus resultados estão sendo preparados para a devolutiva com [nome do gestor ou RH]."
- CTA: "Agendar devolutiva" → redirecionamento para componente de agendamento.
- Nota: "Você verá os resultados **na** devolutiva, junto com um contexto interpretativo. Isto é intencional para evitar interpretações isoladas."

---

## 10. Devolutiva ao Funcionário

### 10.1 Formato

- Sessão 1:1 de 30-45 minutos com **gestor direto ou RH capacitado**.
- **Idealmente** mediada por psicólogo consultor (cenário B). No cenário A (ICAR60) a obrigatoriedade é mais fraca — mas ainda recomendada.
- Relatório visual: gráfico de barras por faixa + narrativa qualitativa + 2-3 recomendações de PDI.

### 10.2 Template de relatório (decisão pendente — §14)

- Gerado pelo sistema, revisado por psicólogo consultor antes da primeira aplicação.
- **Proibido** usar:
  - Diagnósticos ("alto QI", "baixa cognição")
  - Comparações entre funcionários
  - Linguagem que sugira previsão de desempenho
- **Permitido:**
  - Descrições de aspectos do raciocínio que podem ser desenvolvidos
  - Sugestões de exposição/treinamento
  - Perguntas para o funcionário refletir

### 10.3 Gate de liberação do relatório

- Funcionário **não** recebe PDF direto após conclusão.
- Relatório só é liberado **após** a sessão 1:1 — evita interpretação isolada/ansiogênica.
- O funcionário tem direito a receber o PDF após a sessão, incluindo os dados brutos se solicitar (LGPD Art. 9).

---

## 11. Visualização pelo RH/Gestor

### 11.1 Onde aparece

- **Card isolado** no perfil do funcionário em `/rh/funcionarios/:id`, seção "Desenvolvimento".
- **NÃO aparece** em:
  - Dashboard de comparação entre funcionários
  - Relatórios agregados por clínica
  - Exportações CSV default
  - Listagens de pipeline

### 11.2 O que mostra

- Data de conclusão.
- Status (concluído, recusado, em andamento).
- Link "Ver relatório" (só acessível ao gestor direto + RH, com log de acesso).
- Indicador de PDI ativo derivado da devolutiva.

### 11.3 Log de acesso

- Toda visualização do relatório grava um registro em `acesso_dados_sensiveis` (tabela de auditoria LGPD).
- Funcionário pode consultar quem acessou os seus dados e quando (direito LGPD Art. 19).

---

## 12. Consentimento e Direito de Recusar

### 12.1 Direitos do funcionário

- **Recusar o convite inicial** — sem justificativa, sem prejuízo, registrado apenas para não enviar novos convites por 12 meses.
- **Pausar no meio do exercício** — sem qualquer aviso ao gestor. Registro local apenas.
- **Desistir permanentemente após começar** — respostas parciais descartadas.
- **Solicitar a exclusão dos resultados** a qualquer momento após conclusão (ver §8.5).
- **Solicitar uma cópia dos dados brutos** em formato estruturado.

### 12.2 Garantias

- Contrato/CLT explícito: "a participação em ferramentas de desenvolvimento voluntárias é opcional e sua recusa ou desistência não impacta avaliação, remuneração ou vínculo".
- Política interna de RH documentada e assinada.
- Resultados **proibidos** em decisões de:
  - Demissão (Art. 482 CLT não pode ser baseado em resultado cognitivo voluntário)
  - Promoção formal (se promoção depende disso, vira avaliação, não desenvolvimento)
  - Aumento salarial
  - Transferência involuntária

### 12.3 Auditoria

- Sistema grava **todas** as decisões que afetam o funcionário (via tabela existente `historico_funcionario`).
- Se uma dessas decisões ocorrer e houver um registro de Raven nos últimos 90 dias, flag automático para o RH revisar se há conexão indevida.

---

## 13. LGPD

### 13.1 Classificação do dado

- **Dado pessoal sensível** (Art. 5º II + Art. 11 LGPD) — perfil cognitivo enquadra em "dado referente à saúde" numa interpretação prudente (a classificação exata é controversa, mas tratar como sensível é o caminho seguro).

### 13.2 Base legal

- **Consentimento explícito, específico e destacado** (Art. 11 I).
- Não pode ser cláusula genérica do contrato de trabalho — precisa ser um ato específico dentro do sistema (§9.3).

### 13.3 Finalidade

- Declarada de forma específica: "desenvolvimento individual do funcionário, elaboração de plano de desenvolvimento pessoal, apoio a decisões de rotação interna voluntária".
- Qualquer outra finalidade exige novo consentimento.

### 13.4 Retenção

- Máximo 2 anos após conclusão (§8.5).
- Deleção imediata mediante pedido do titular.

### 13.5 Compartilhamento

- **Não compartilhar** com terceiros (Pearson, consultorias, integradores). Os dados ficam no ambiente Supabase da Beauty Smile.
- Exceção: psicólogo consultor contratado como operador — exige contrato DPA (Data Processing Agreement).

### 13.6 Incidentes

- Plano de resposta a incidentes deve tratar `onboarding_raven` como tabela de risco elevado.
- Notificação ANPD obrigatória em 48h em caso de vazamento.

---

## 14. Gaps e Decisões Pendentes

| ID | Gap | Impacto | Responsável | Prazo |
|---|---|---|---|---|
| G-01 | **Decisão cenário A (ICAR60) vs B (Raven licenciado) vs remover módulo** | BLOQUEADOR — nada de código antes | Fernando + cliente BS | Antes Fase 9.5 |
| G-02 | Consulta jurídica externa sobre uso de Raven/testes cognitivos em onboarding sem psicólogo | Alta — base da premissa legal | Fernando + advogado trabalhista | Antes decisão G-01 |
| G-03 | **Auditoria + deleção imagens legadas** (§5) | P0 — risco de copyright ativo agora | Fernando | Imediato, independente de G-01 |
| G-04 | Contratar psicólogo consultor pontual para: validar fluxo, revisar template de devolutiva, plantão | Alta — necessário em ambos cenários A e B | Cliente BS | Antes primeira aplicação real |
| G-05 | Definir norma de score (percentil vs. faixas qualitativas) — §7.2 | Média | Psicólogo consultor | Junto com template |
| G-06 | Criar template de relatório de devolutiva (HTML/PDF) | Média | Fernando + consultor | Antes primeira aplicação |
| G-07 | Definir tabela `funcionarios` — dependência externa deste PRD | Alta — schema do módulo pendente | Fernando | Antes da implementação |
| G-08 | Se cenário B: cotação formal Pearson Brasil para licença corporativa Raven | Alta — pode inviabilizar cenário | Cliente BS | Antes decisão G-01 |
| G-09 | Definir SLA de devolutiva (tempo máximo entre conclusão do exercício e sessão 1:1) | Baixa | RH BS | Antes primeira aplicação |
| G-10 | Cláusula específica no contrato CLT sobre voluntariedade (§12.2) | Alta | Advogado trabalhista | Antes primeira aplicação |

---

## 15. Riscos Legais Residuais

| ID | Risco | Severidade | Probabilidade | Mitigação |
|---|---|---|---|---|
| RL-01 | Pearson descobrir uso não licenciado de itens Raven | Crítica (processo cível + medida cautelar) | Média-alta se embedar imagens próprias | Deletar imagens legadas (§5) + escolher cenário A (ICAR60) ou B com licença formal |
| RL-02 | Funcionário contestar uso de teste sem psicólogo alegando exercício ilegal de psicologia | Alta (ação CFP + ação trabalhista) | Baixa se 100% voluntário e sem impacto em decisão + Média caso contrário | Consentimento robusto (§9.3) + políticas §12 + psicólogo consultor (§14 G-04) |
| RL-03 | Funcionário alegar decisão trabalhista baseada em Raven (mesmo sem ter sido) | Média (ação trabalhista, ônus da prova para empresa) | Baixa se auditoria (§11.3) implementada | Log de decisões + cláusula contratual §12.2 |
| RL-04 | Uso de teste SATEPSI-desfavorável caracterizado como "teste psicológico leigo" e sancionado pelo CFP | Média (ação regulatória + reputacional) | Média se Raven for usado | Escolher cenário A (ICAR não é teste psicológico regulamentado) |
| RL-05 | ANPD autuar por falha de consentimento específico ou retenção indevida | Média-alta (multa LGPD) | Baixa se §13 implementado corretamente | Implementar consentimento (§9.3) + retenção automática (§8.5) + log de acesso (§11.3) |
| RL-06 | Vazamento de dados cognitivos de funcionários | Crítica (reputacional + multa LGPD + processo individual) | Baixa se RLS (§8.3) + storage restrito (§8.4) | Arquitetura descrita + backup criptografado + teste de pentest anual |
| RL-07 | Uso não intencional de resultados em decisões (gestor olha o card antes de uma promoção) | Média | Média (sem controle técnico é difícil impedir) | UX §11 (card isolado) + treinamento RH + log de acesso + auditoria 90 dias §12.3 |
| RL-08 | Imagens legadas continuarem em git history mesmo após `git rm` | Alta | 100% se não houver rewrite | `git filter-repo` + notificar clones (§5.4) |
| RL-09 | Consultor psicólogo contratado como operador LGPD sem DPA adequado | Média (responsabilidade compartilhada mal documentada) | Média | DPA formal antes da primeira aplicação |
| RL-10 | Cliente Beauty Smile ampliar uso para fins não-desenvolvimentais sem revisar o PRD | Média-alta (vira seleção disfarçada) | Média ao longo de 1-2 anos | Revisão anual do PRD + governança de mudança + cláusula no contrato interno |

### 15.1 Mitigação consolidada

A combinação mais robusta é:
1. **Cenário A (ICAR60)** — elimina RL-01 e RL-04.
2. **Deleção total das imagens legadas com rewrite de histórico** — elimina RL-08 e reduz RL-01.
3. **Consentimento §9.3 + políticas §12 + cláusula CLT §12.2** — reduz RL-02 e RL-03.
4. **Auditoria §11 + log §13** — reduz RL-05, RL-06, RL-07.
5. **Psicólogo consultor (mesmo em cenário A)** — reduz RL-02 e RL-09.

Se qualquer um dos 5 não for implementado, o módulo **não deve ir a produção**.

---

## 16. Referências

### Legislação e normativos

- **Resolução CFP nº 31/2022** — Diretrizes para avaliação psicológica e regulamentação do SATEPSI. [site.cfp.org.br/legislacao](https://site.cfp.org.br/)
- **Resolução CFP nº 09/2018** — Revogada pela 31/2022 mas relevante historicamente.
- **Resolução CFP nº 002/2003** — Revogada pela 09/2018 mas citada no PRD-MASTER.
- **Lei 4.119/1962** — Regulamentação da profissão de psicólogo. Art. 13 restringe testes a psicólogos.
- **Lei 13.709/2018 (LGPD)** — Art. 5º II (dado sensível), Art. 7º (bases legais), Art. 11 (consentimento sensível), Art. 18 (direitos do titular).
- **Lei 9.029/1995** — Proibição de práticas discriminatórias no trabalho.
- **CLT Art. 482** — Justa causa (não pode se basear em teste de desenvolvimento voluntário).
- **Súmula Vinculante 44 STF** — Psicotécnico em concurso público exige lei (referência tangencial).

### Listas técnicas do SATEPSI (consulta obrigatória antes de implementar)

- [Lista de testes desfavoráveis](https://satepsi.cfp.org.br/testesDesfavoraveis.cfm) — Raven consta aqui.
- [Lista de testes favoráveis](https://satepsi.cfp.org.br/testesFavoraveis.cfm)
- [Instrumentos não privativos](https://satepsi.cfp.org.br/testesNaoPrivativos.cfm)

### Fontes comerciais

- [Pearson Clinical Brasil](https://www.pearsonclinical.com.br/) — Licenciamento de Raven no Brasil.
- [Pearson TalentLens](https://www.talentlens.com/) — Linha corporativa (Raven's Adaptive, APM-III).
- [Raven's Progressive Matrices 2nd Ed](https://www.pearsonassessments.com/en-us/Store/Professional-Assessments/Cognition-&-Neuro/Raven%E2%80%99s-Progressive-Matrices-Second-Edition-%7C-Raven's-2/p/100001960) — Pearson Assessments US.

### Alternativas open-access

- [The ICAR Project](https://icar-project.com/) — Catálogo, guidelines, dados.
- [Selected ICAR Data from the SAPA-Project (Journal of Open Psychology Data)](https://openpsychologydata.metajnl.com/articles/10.5334/jopd.25) — Condon & Revelle, 2014.
- [ICAR Catalogue v1.0 (PDF)](https://icar-project.com/ICAR_Catalogue.pdf) — Itens, normas, autoria.

### Literatura citada no PRD-MASTER

- Raven, J. C. (1938). *Progressive Matrices*.
- Angelini, A. L. et al. — Adaptações brasileiras do Raven (uso histórico).
- Pasquali, L. — Padronizações brasileiras de Raven.
- Condon & Revelle (2014) — "The International Cognitive Ability Resource: Development and initial validation of a public-domain measure." *Intelligence*, 43.

### Referências cruzadas no repositório

- `docs/prds/PRD-MASTER-sistema-recrutamento.md` §10.3.1 — placeholder deste PRD.
- `docs/prds/cognitivo-icar-prd.md` — mini-PRD da contraparte em seleção.
- `docs/prds/0009-prd-teste-raven.md` — PRD legado da v1.0 (implementava Raven em seleção; substituído por este PRD + cognitivo-icar-prd).
- `src/copiar-imagens-raven.sh` — artefato a deletar (§5).
- `src/assets/images/raven/*.webp` — 62 arquivos a deletar (§5).

---

**Última revisão:** 2026-04-19
**Próxima revisão obrigatória:** após decisão G-01 (cenário A/B/remover)
**Status de implementação:** bloqueado até G-01, G-02, G-03 resolvidos.
