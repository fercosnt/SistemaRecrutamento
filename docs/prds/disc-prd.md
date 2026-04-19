# Mini-PRD: Teste DISC (Contextual, Não-Eliminatório)

> **Status:** Draft v1 — pronto para revisão do psicólogo consultor e engenharia
> **Relacionado:** `PRD-MASTER-sistema-recrutamento.md` §10.2, §6.2 (`scores_candidato`, `vaga_testes_aplicaveis`)
> **Owner do PRD:** Produto + Psicólogo Consultor
> **Última atualização:** 2026-04-19
> **Idioma-alvo:** pt-BR
> **Escopo:** Beauty Smile — rede brasileira de clínicas odontológicas

---

## 1. Papel no Sistema — CONTEXTO APENAS

### 1.1 Princípio central

O teste DISC no Sistema de Recrutamento Beauty Smile é explicitamente posicionado como **instrumento de CONTEXTO COMPORTAMENTAL**, **NUNCA COMO FILTRO ELIMINATÓRIO**. Nenhum candidato é aprovado, reprovado, priorizado ou despriorizado com base no resultado DISC.

### 1.2 Por que NÃO é filtro

Três razões combinadas:

1. **Científica:** DISC é uma tipologia comportamental auto-relatada, não uma medida de desempenho laboral. Sua validade preditiva para sucesso em função (job performance) é fraca e inconsistente na literatura — bem abaixo de conscienciosidade (Big Five) ou raciocínio geral (g). Usar DISC como filtro adiciona ruído, não sinal.
2. **Legal/ética:** O cliente optou por **NÃO contratar psicólogo registrado no CFP**. Instrumentos do SATEPSI (Sistema de Avaliação de Testes Psicológicos do Conselho Federal de Psicologia) exigem aplicação, correção e interpretação por psicóloga(o) com CRP ativo (Resolução CFP nº 31/2022). Usar qualquer instrumento para tomar **decisão de emprego** sem psicólogo é risco trabalhista — mitigado aqui mantendo o DISC como informação contextual e não critério de decisão.
3. **Negócio:** o propósito real é dar ao gestor **linguagem comum e estratégia de abordagem** para a entrevista e para o onboarding, não peneirar CVs.

### 1.3 Como alimenta a entrevista presencial

- O RH/gestor abre o perfil do candidato antes da entrevista e vê um **card "Perfil DISC"** com:
  - 4 barras horizontais (D, I, S, C) com intensidade 0–100.
  - Rótulo de perfil primário e secundário (ex: "Alto C com traço D" / "Padrão Analítico").
  - 3–5 **sugestões de perguntas personalizadas** para o perfil detectado (gerado por template, ver §11.3).
  - 3–5 **pontos de atenção de comunicação** para o entrevistador (ex: "Dê tempo para pensar — candidato Alto C reage mal a perguntas abertas sem contexto").

### 1.4 Como alimenta plano de desenvolvimento pós-contratação

Ao contratar, o perfil DISC é copiado para o registro do colaborador (tabela `colaboradores` / `onboarding_*`) e usado por:

- Gestor direto no **plano de integração dos 90 dias** (ex: "alto I precisa de feedback frequente e público; alto S precisa de clareza de expectativas antes de autonomia").
- RH para **alocação em times** (evitar times 100% mesmo perfil; conhecer distribuição D/I/S/C da clínica).
- **Trilha de desenvolvimento** (ex: alto D recebe treinamento de escuta ativa; alto S recebe coaching de assertividade).

### 1.5 O que NÃO fazemos com DISC

- ❌ Rejeitar candidato automaticamente.
- ❌ Ordenar ranking de candidatos pelo perfil DISC.
- ❌ Mostrar o perfil DISC no portal público da vaga.
- ❌ Mostrar o relatório do DISC para o próprio candidato (só o gestor vê) — **exceto** em caso de solicitação formal LGPD (ver §13).
- ❌ Usar DISC isoladamente para qualquer decisão de RH.

---

## 2. O que é DISC

### 2.1 Modelo teórico

Marston (1928) — *The Emotions of Normal People* — propôs um modelo bidimensional de comportamento em quatro quadrantes, hoje conhecido como DISC:

| Fator | Nome clássico | Foco | Palavras-âncora |
|---|---|---|---|
| **D** | Dominance (Dominância) | Como reagimos a **problemas/desafios** | Direto, competitivo, assertivo, decisivo |
| **I** | Influence (Influência) | Como interagimos com **pessoas** | Entusiasta, sociável, otimista, persuasivo |
| **S** | Steadiness (Estabilidade) | Como lidamos com **ritmo/mudança** | Calmo, paciente, leal, colaborativo |
| **C** | Conscientiousness (Conformidade) | Como seguimos **regras/procedimentos** | Analítico, preciso, cuidadoso, sistemático |

Marston cruzou dois eixos — ambiente (favorável vs. antagônico) × comportamento (ativo vs. passivo) — gerando os 4 quadrantes.

### 2.2 Linhagem histórica (resumo)

- **1928** — Marston publica a teoria. Nunca registrou patente/copyright do modelo conceitual. **Modelo em domínio público.**
- **1940s** — Walter Clarke transforma a teoria em instrumento: *Activity Vector Analysis*, com checklist de adjetivos.
- **1970s** — John Geier cria o *Personal Profile System (PPS)* com formato ipsativo de 24 tetrads (blocos de 4 adjetivos) — base do que hoje é o "DISC Classic".
- **1994–presente** — Wiley adquire os direitos e cria a linha proprietária *Everything DiSC®* (com o "i" minúsculo registrado como marca). É **derivado proprietário** — não usar sem licença.
- Outras variantes proprietárias: **Persolog®**, **Extended DISC®**, **PeopleKeys®**, **Thomas PPA®**, **Profiles International®**.

### 2.3 Padrões clássicos (opcional para V1)

Clarke/Geier identificaram ~15 padrões clássicos (combinações). Exemplos:

| Padrão | Estilo dominante | Rótulo comum |
|---|---|---|
| Alto D, baixo S/C | D puro | *Desenvolvedor* / *Resultado* |
| Alto D + alto I | DI | *Inspirador* |
| Alto I + alto S | IS | *Conselheiro* |
| Alto S + alto C | SC | *Especialista* |
| Alto C + alto D | CD | *Perfeccionista exigente* |
| Alto D + baixo I, S, C | — | *Pioneiro* |

**Decisão V1:** reportar apenas **perfil primário + secundário** (não os 15 padrões — simplifica UX e reduz risco de interpretação forçada). Padrões clássicos podem vir em V2 após validação com amostra interna.

---

## 3. Versão Escolhida

### 3.1 Decisão

**DISC clássico em domínio público**, formato ipsativo de **24 blocos de 4 adjetivos** (tetrads), com **banco de adjetivos pt-BR próprio** criado pelo psicólogo consultor em colaboração com o time.

### 3.2 Por que clássico e não proprietário

| Critério | Clássico (Marston/Geier-era) | Wiley Everything DiSC® | Persolog® / Extended DISC® |
|---|---|---|---|
| Licença | Domínio público | Licença comercial paga | Licença comercial paga |
| Custo por aplicação | Zero | ~US$ 50–100 / candidato | ~US$ 40–80 / candidato |
| SATEPSI | Não (não é teste psicológico regulado) | Não (não é SATEPSI) | Não (não é SATEPSI) |
| Banco de itens pt-BR | **Criar próprio** | Incluso na licença | Incluso na licença |
| Relatório proprietário | **Criar próprio** | Incluso | Incluso |
| Risco trabalhista | Baixo se usado como contexto | Mesmo risco + custo | Mesmo risco + custo |

Orçamento limitado + DISC contextual (não decisório) = **versão clássica ipsativa própria é a escolha óbvia**.

### 3.3 Por que NÃO Everything DiSC® / Persolog®

Além do custo recorrente, o contrato de licença da Wiley (ver Content License Agreement público) restringe:
- Cópia e adaptação dos materiais.
- Uso programático automatizado em plataforma SaaS própria sem acordo específico.
- Apresentação dos relatórios fora do kit oficial.

Incompatível com o modelo do sistema (plataforma própria, relatório custom, automação).

---

## 4. Licenciamento e Status SATEPSI

### 4.1 Domínio público — o quê?

- **Teoria DISC de Marston (1928):** domínio público.
- **Conceito dos 4 fatores, escolha forçada em tetrads, contagem "mais/menos":** não é patenteável — técnica metodológica livre.
- **Adjetivos descritivos em si:** palavras comuns do léxico português — não protegidos.
- **Bancos de adjetivos e relatórios específicos de fornecedores (Wiley, Persolog):** PROTEGIDOS por copyright — não copiar.

### 4.2 SATEPSI — status

Pesquisa na lista do SATEPSI (https://satepsi.cfp.org.br/):

- **Não há um "teste DISC oficial" com parecer favorável do SATEPSI** que seja usado como referência regulatória única. O SATEPSI não trata de "famílias de instrumentos" — trata de **versões específicas** submetidas por editoras.
- Algumas versões proprietárias comerciais de DISC foram submetidas ao SATEPSI ao longo dos anos; o status varia (algumas favoráveis, algumas desfavoráveis, algumas não avaliadas). **Ação:** o psicólogo consultor deve consultar a lista atualizada em https://satepsi.cfp.org.br/listaTeste.cfm e confirmar que a versão que construiremos NÃO coincide nominalmente com uma versão SATEPSI favorável (para não induzir confusão regulatória).
- A versão que construiremos será **explicitamente rotulada** como "Questionário Comportamental DISC — Beauty Smile (instrumento interno, uso contextual)". **Não pode ser chamado de "teste psicológico"** nas telas, documentação, e-mails ou termo de consentimento.

### 4.3 Regra de ouro

**Se o instrumento for SATEPSI, não usamos.** Se não for, chamamos de "questionário comportamental" (não "teste psicológico") e não automatizamos decisões de emprego com ele.

### 4.4 Linguagem no produto

| Onde | Nunca usar | Usar |
|---|---|---|
| Tela do candidato | "teste psicológico" | "questionário comportamental" |
| Tela do RH | "laudo DISC" | "perfil comportamental DISC" |
| Termo de consentimento | "avaliação psicológica" | "questionário auto-relato de estilo comportamental" |
| Copy de marketing | "Aprovado pelo CFP" | (nada — não é regulado) |

---

## 5. Banco de Adjetivos pt-BR

### 5.1 Estado atual

**Não existe banco de adjetivos DISC open-access validado em pt-BR que possamos simplesmente importar.** Listas comerciais (Wiley, Persolog, Thomas) são proprietárias. Traduzir literalmente listas em inglês é legalmente cinzento e psicometricamente pobre (tradução back-to-back sem validação).

### 5.2 Decisão: criar banco próprio

**Responsável principal:** psicólogo consultor contratado como PJ para a construção do instrumento (escopo delimitado, não é prática clínica — é consultoria de construção de ferramenta).

**Input inicial:**
- Listas de adjetivos por fator disponíveis em literatura acadêmica (Marston 1928, artigos científicos que descrevem os quadrantes com adjetivos-âncora).
- Dicionários pt-BR open-source: Unitex-PT-BR (`datasets-br/unitex-pt-br`), DELAS/DELACF, wordlists do projeto EticaAI Linguistic Datasets for Portuguese.
- Thesaurus pt-BR open-source (TEP — Thesaurus Eletrônico do Português).

### 5.3 Processo de construção (gate antes da Fase 9.2)

| Etapa | Owner | Entregável |
|---|---|---|
| 1. Gerar lista inicial de ~150 adjetivos candidatos por fator (600 no total) | Psicólogo consultor | Planilha com coluna `adjetivo`, `fator_proposto`, `fonte` |
| 2. Peer review interno (3 revisores: psicólogo + 2 colaboradores Beauty Smile de áreas distintas) | Time BS | Planilha com % concordância por item |
| 3. Reduzir para ~25 adjetivos por fator (100 total) mantendo só itens com ≥ 80% concordância | Psicólogo | Banco de trabalho v0 |
| 4. Montar 24 tetrads **balanceados** (cada tetrad tem 1 D + 1 I + 1 S + 1 C com intensidade social parecida) | Psicólogo | `disc_itens.sql` seed |
| 5. Piloto com 20–30 colaboradores atuais Beauty Smile (convite voluntário, não vinculado a avaliação) | RH | CSV de respostas do piloto |
| 6. Análise estatística do piloto: consistência interna (alfa por fator), distribuição de seleção "mais/menos" | Psicólogo | Relatório de validação interna v1 |
| 7. Ajustar tetrads com itens problemáticos, repetir piloto se necessário | Psicólogo | Banco v1 aprovado para produção |

### 5.4 Regras para os adjetivos

- Devem ser **adjetivos comuns e compreensíveis** (6ª série de escolaridade — público Beauty Smile inclui recepcionistas e ASB). Evitar eruditismos.
- Evitar adjetivos **socialmente muito desejáveis ou indesejáveis** dentro do mesmo tetrad (balanceamento).
- Todos devem ter valência neutra-positiva (evitar "preguiçoso", "arrogante").
- Cada adjetivo mapeia a **um único fator** (evitar adjetivos ambíguos como "determinado" que pode ser D ou C).

### 5.5 Exemplos ilustrativos de tetrads (**apenas exemplo, não o banco final**)

```
Tetrad 01:  [D] ousado   [I] animado   [S] paciente   [C] cuidadoso
Tetrad 02:  [D] firme    [I] alegre    [S] gentil     [C] exato
Tetrad 03:  [D] direto   [I] falante   [S] tranquilo  [C] correto
...
Tetrad 24:  [D] decidido [I] simpático [S] estável    [C] organizado
```

---

## 6. Formato Ipsativo (Forced-Choice) vs. Normativo (Likert)

### 6.1 Decisão: IPSATIVO (forced-choice "mais/menos")

Para cada tetrad, o candidato escolhe:
- **1 adjetivo que MAIS o descreve**
- **1 adjetivo que MENOS o descreve**
- 2 ficam sem marca

### 6.2 Justificativa (ipsativo é adequado para contexto, não seleção)

A literatura recente (Zhang et al. 2024; Combrinck 2024; simulações Frontiers 2017) converge em:

| Critério | Ipsativo (forced-choice) | Normativo (Likert) |
|---|---|---|
| Reduz viés de desejabilidade social | **Sim** (candidato não consegue marcar "5-concordo totalmente" em tudo) | Não |
| Comparabilidade ENTRE candidatos | Limitada — scores são relativos ao próprio candidato | Boa |
| Comparabilidade DENTRO do candidato | **Excelente** (perfil relativo D vs I vs S vs C) | Também boa |
| Complexidade de scoring | Média | Baixa |
| Apto para DECISÃO de emprego (filtro) | Controverso — scores ipsativos não permitem ranking justo | Recomendado |
| Apto para CONTEXTO comportamental | **Ideal** — mostra estilo dentro do próprio candidato | Também funciona |

**No Beauty Smile, DISC é contexto (não filtro).** Por isso ipsativo é a escolha correta:
- Elimina inflação ("todos se consideram ótimos").
- Gera o perfil D/I/S/C **relativo** dentro do próprio candidato — que é exatamente o que o gestor precisa (estilo comunicacional, não ranking).
- É a forma historicamente consagrada do DISC (Geier-era), familiar a RHs brasileiros.

### 6.3 O que NÃO fazemos

- Não somamos scores ipsativos de diferentes candidatos para criar ranking.
- Não cruzamos score DISC com score Big Five (que é normativo) no `score_principal` agregado sem justificativa técnica.
- Não interpretamos "baixo S" como *déficit* — é *relatividade* dentro do próprio perfil.

---

## 7. Número de Itens e Tempo de Aplicação

| Parâmetro | Valor | Racional |
|---|---|---|
| Nº de tetrads (blocos) | **24** | Padrão histórico do PPS/DISC Classic; suficiente para estabilidade; ajuste possível após piloto |
| Adjetivos por tetrad | 4 | 1 por fator D/I/S/C, balanceados |
| Total de adjetivos | 96 (24 × 4) | Com banco de ~100 adjetivos — alguma redundância intencional |
| Nº de seleções por tetrad | 2 (1 "mais" + 1 "menos") | Forced-choice clássico |
| Tempo esperado | **8–12 min** | Piloto interno confirma — alvo UX é ≤ 10 min |
| Timer rígido? | **Não** | DISC é auto-descrição, não cognitivo. Timer gera ansiedade e distorce. |
| Autosave | Por tetrad | Evita perda por queda de conexão |
| Possibilidade de voltar | Sim, livre navegação entre tetrads antes do submit | UX padrão |

---

## 8. Cálculo de Score

### 8.1 Fórmula base (ipsativo clássico)

Para cada fator `F ∈ {D, I, S, C}`:

```
mais_F  = número de vezes que adjetivo do fator F foi marcado como "MAIS"
menos_F = número de vezes que adjetivo do fator F foi marcado como "MENOS"

score_bruto_F = mais_F - menos_F
   (varia de -24 a +24, teoricamente)
```

### 8.2 Normalização para 0–100

```
score_F_norm = round( ((score_bruto_F + 24) / 48) * 100 )
```

Isso coloca cada fator em escala 0–100 independente do número de tetrads. Valores típicos ficam concentrados em 30–70 (extremos são raros).

### 8.3 Perfil primário e secundário

```
ordenados = sort desc by score_F_norm em [D, I, S, C]
perfil_primario   = ordenados[0]
perfil_secundario = ordenados[1]  (se diferença vs. primário ≥ 10; senão 'misto')
```

### 8.4 Output do score (`scores_candidato.score_json`)

```json
{
  "versao_modelo": "disc-classic-bs-v1",
  "formato": "ipsativo_24tetrads",
  "mais": {"d": 7, "i": 5, "s": 4, "c": 8},
  "menos": {"d": 3, "i": 6, "s": 9, "c": 2},
  "bruto": {"d": 4, "i": -1, "s": -5, "c": 6},
  "norm": {"d": 58, "i": 48, "s": 40, "c": 62},
  "perfil_primario": "c",
  "perfil_secundario": "d",
  "rotulo": "Perfil Analítico (alto C com traço D)",
  "observacoes": []
}
```

`score_principal` (coluna separada em `scores_candidato`): **NULL** para DISC. Não há score ordinal único. Alternativa: usar `0` + flag `nao_ordena`. **Decisão:** manter `NULL` (consistente com semântica "sem ranking") — validar com ORM.

### 8.5 Flags de qualidade da resposta

Inserir em `score_json.observacoes`:
- `"perfil_plano"` — se todos os 4 fatores estiverem entre 40 e 60 (pouca diferenciação — interpretar com cautela).
- `"padrao_rapido"` — se tempo total < 3 min (possível resposta sem leitura).
- `"padrao_fixo"` — se sempre marcou "mais" no 1º adjetivo de cada tetrad ou similar (response set).

Esses flags aparecem no card do RH com tooltip explicativo.

---

## 9. Modelo de Dados (SQL DDL)

### 9.1 Tabela `disc_itens` (banco de adjetivos — seed imutável por versão)

```sql
CREATE TABLE disc_itens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  versao_banco    text NOT NULL,                    -- ex: 'disc-classic-bs-v1'
  tetrad_numero   int  NOT NULL CHECK (tetrad_numero BETWEEN 1 AND 40),
  posicao         int  NOT NULL CHECK (posicao BETWEEN 1 AND 4),  -- posição dentro do tetrad (1..4)
  adjetivo        text NOT NULL,
  fator           text NOT NULL CHECK (fator IN ('d','i','s','c')),
  ativo           boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (versao_banco, tetrad_numero, posicao),
  UNIQUE (versao_banco, adjetivo)
);

CREATE INDEX idx_disc_itens_versao ON disc_itens(versao_banco);
```

### 9.2 Tabela `respostas_disc`

```sql
CREATE TABLE respostas_disc (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidatura_id   uuid NOT NULL REFERENCES candidaturas(id) ON DELETE CASCADE,
  versao_banco     text NOT NULL,
  tetrad_numero    int  NOT NULL,
  item_mais_id     uuid NOT NULL REFERENCES disc_itens(id),
  item_menos_id    uuid NOT NULL REFERENCES disc_itens(id),
  tempo_ms         int,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CHECK (item_mais_id <> item_menos_id),
  UNIQUE (candidatura_id, versao_banco, tetrad_numero)
);

CREATE INDEX idx_respostas_disc_cand ON respostas_disc(candidatura_id);
```

### 9.3 Extensão de `scores_candidato` (já existe no MASTER §6.2)

Sem alteração de schema — DISC usa a tabela unificada:

```sql
-- já existe:
-- scores_candidato (candidatura_id, tipo_teste, score_json, score_principal, versao_modelo)
-- com UNIQUE (candidatura_id, tipo_teste)

-- para DISC:
-- tipo_teste     = 'disc'
-- score_principal = NULL  (sem score ordinal)
-- versao_modelo  = 'disc-classic-bs-v1'
-- score_json     = estrutura do §8.4
```

### 9.4 `vaga_testes_aplicaveis` (já existe no MASTER §6.2) — restrições para DISC

```sql
-- Constraint adicional via trigger ou check em nível de app:
-- quando tipo_teste='disc', threshold_eliminatorio DEVE ser NULL

-- Regra de validação (trigger sugerido):
CREATE OR REPLACE FUNCTION validate_disc_no_threshold()
RETURNS trigger AS $$
BEGIN
  IF NEW.tipo_teste = 'disc' AND NEW.threshold_eliminatorio IS NOT NULL THEN
    RAISE EXCEPTION 'DISC não pode ter threshold_eliminatorio (contexto, não filtro)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_disc_no_threshold
BEFORE INSERT OR UPDATE ON vaga_testes_aplicaveis
FOR EACH ROW EXECUTE FUNCTION validate_disc_no_threshold();
```

### 9.5 RLS (Row Level Security)

- `respostas_disc`: candidato pode INSERT/SELECT apenas as próprias (via `candidatura_id.candidato_id = auth.uid()`). RH com papel adequado pode SELECT todas.
- `disc_itens`: read-only para authenticated; write apenas via service role (seed).
- `scores_candidato` (tipo_teste='disc'): read para RH + candidato (próprio); write apenas via edge function de scoring.

---

## 10. UX do Candidato

### 10.1 Fluxo de telas

1. **Tela de Instruções** (antes de iniciar)
   - Título: "Questionário Comportamental DISC"
   - Subtítulo: "Este questionário nos ajuda a conhecer seu estilo de trabalho. Não há respostas certas ou erradas — responda com sinceridade pensando em como você é no dia a dia."
   - Caixa de destaque: "Este questionário NÃO elimina você do processo. Ele serve apenas como contexto para a entrevista."
   - Tempo estimado: "8 a 12 minutos"
   - Número de blocos: "24 blocos de 4 palavras"
   - Instruções forced-choice:
     - "Em cada bloco, marque **1 palavra que MAIS descreve você** e **1 palavra que MENOS descreve você**."
     - "As outras 2 palavras você deixa sem marca."
   - Consentimento LGPD (ver §13) — checkbox obrigatório.
   - Botão "Começar".

2. **Tela de Bloco (×24)**
   - Barra de progresso: "Bloco 07 de 24"
   - 4 adjetivos empilhados verticalmente, cada um com 2 radio-buttons à direita: ( ) Mais  ( ) Menos.
   - Validação: não avança sem 1 "mais" e 1 "menos" marcados; não pode marcar o mesmo adjetivo como ambos.
   - Botões "Anterior" / "Próximo".
   - Autosave a cada avanço.

3. **Tela de Revisão (opcional)**
   - Lista resumida dos 24 blocos com as escolhas feitas.
   - Botão "Editar bloco N" permite voltar.
   - Botão "Enviar respostas".

4. **Tela de Confirmação**
   - Mensagem: "Obrigado! Suas respostas foram registradas."
   - Aviso: "Você NÃO verá o resultado deste questionário. Ele é usado internamente pelo time de seleção como contexto para sua entrevista."
   - CTA: "Voltar ao meu painel" → dashboard do candidato.

### 10.2 Acessibilidade

- Navegação por teclado em todas as telas (tab + espaço + setas).
- Labels ARIA nos radio-buttons.
- Contraste AA mínimo.
- Fonte mínima 16px.
- Sem timer visível (não é teste de velocidade).

### 10.3 Mobile

- Tetrad em coluna única (adjetivos empilhados).
- Radio-buttons grandes (min 44×44 px).
- Progresso fixo no topo.

### 10.4 Estados de erro

- Perda de conexão: autosave local (IndexedDB ou localStorage) + reenvio ao voltar online.
- Sessão expirada: manter respostas parciais em storage local; redirecionar para login e recuperar.

---

## 11. UX do RH — Card DISC no Perfil do Candidato

### 11.1 Localização

No layout do perfil do candidato (`MeuPerfilCandidatoPage` visão RH / `CandidatosRHPage` drawer), abaixo do card Big Five e acima do card Cultural — uma seção "Perfil Comportamental DISC".

### 11.2 Componentes visuais

**Bloco 1 — Barras D/I/S/C:**

```
D  Dominância   ███████████░░░░░░░░  58
I  Influência   █████████░░░░░░░░░░  48
S  Estabilidade ███████░░░░░░░░░░░░  40
C  Conformidade ████████████░░░░░░░  62
```

Cor suave por fator: D = vermelho; I = amarelo; S = verde; C = azul (convenção DISC clássica — manter compatibilidade com material de treinamento).

**Bloco 2 — Rótulo de perfil:**

> **Perfil primário:** Conformidade (Alto C)
> **Secundário:** Dominância (Alto D)
> **Rótulo:** *Analítico com impulso de resultado*

**Bloco 3 — Tags de observações automáticas:**

- 🟡 "Perfil plano — todos os fatores próximos. Interpretar com cautela."
- 🟡 "Respondeu em 2min30s — rapidez acima do típico."

(só aparecem se flags disparadas)

### 11.3 Sugestões Automáticas para Entrevista

Gerador de sugestões rule-based a partir do perfil primário. Template inicial (psicólogo consultor deve revisar e expandir):

#### 11.3.1 Alto D (Dominância)

**Pontos de atenção na comunicação:**
- Vá direto ao ponto. Evite rodeios.
- Seja objetivo nas perguntas — candidato pode impacientar com história longa.
- Não interprete firmeza como agressividade.

**Perguntas sugeridas:**
1. "Conte uma situação recente em que você teve que tomar uma decisão difícil sem ter todas as informações."
2. "Como você lida quando seu chefe muda de opinião no meio de um projeto?"
3. "Fale de uma vez em que precisou pedir ajuda em vez de resolver sozinho."
4. "Que tipo de ritmo de trabalho te frustra mais — muito acelerado ou muito burocrático?"

**Desenvolvimento pós-contratação:**
- Trabalhar escuta ativa e paciência com processos.
- Alocar em funções com autonomia clara e metas objetivas.

#### 11.3.2 Alto I (Influência)

**Pontos de atenção na comunicação:**
- Deixe espaço para rapport; candidato esquenta com conversa mais leve.
- Cuidado: pode responder "sim a tudo" — peça exemplos concretos.
- Valide com detalhes específicos, não só entusiasmo verbal.

**Perguntas sugeridas:**
1. "Me dê um exemplo de quando você teve que focar sozinho em uma tarefa repetitiva por horas. Como foi?"
2. "Conte uma situação em que precisou dar uma notícia ruim a um cliente."
3. "Como você organiza suas tarefas em uma semana cheia?"
4. "Em que tipo de ambiente você produz melhor — muito movimentado ou mais silencioso?"

**Desenvolvimento pós-contratação:**
- Trabalhar foco e disciplina de processos.
- Alocar em funções com exposição social (atendimento, representação).

#### 11.3.3 Alto S (Estabilidade)

**Pontos de atenção na comunicação:**
- Dê tempo. Não interrompa pausas — candidato precisa processar antes de falar.
- Evite perguntas "e se…" muito abstratas — prefira casos concretos passados.
- Crie clima de segurança antes de temas delicados.

**Perguntas sugeridas:**
1. "Conte uma mudança grande no trabalho que te pegou de surpresa. Como você reagiu?"
2. "Quando você discorda do seu gestor, como costuma agir?"
3. "Fale de uma vez em que precisou dar um feedback difícil a um colega."
4. "O que te motiva a permanecer anos em uma mesma empresa?"

**Desenvolvimento pós-contratação:**
- Trabalhar assertividade e tolerância à mudança.
- Alocar em funções que valorizam consistência e colaboração.

#### 11.3.4 Alto C (Conformidade)

**Pontos de atenção na comunicação:**
- Dê contexto antes da pergunta. Perguntas abertas sem contexto geram desconforto.
- Espere respostas detalhadas e estruturadas — não corte.
- Aceite pedido de esclarecimento sobre o propósito das perguntas.

**Perguntas sugeridas:**
1. "Conte uma situação em que teve que agir com informação incompleta e prazo curto."
2. "Como você reage quando alguém do time não segue um processo que você considera importante?"
3. "Dê um exemplo de erro seu no trabalho. Como lidou?"
4. "Prefere receber regras claras ou autonomia ampla? Por quê?"

**Desenvolvimento pós-contratação:**
- Trabalhar tolerância à ambiguidade e tomada de decisão com dados parciais.
- Alocar em funções técnicas, de qualidade, compliance, protocolos clínicos.

### 11.4 Notas para Desenvolvimento Pós-Contratação

Abaixo da seção de entrevista, um painel colapsado "Ao contratar — plano de integração sugerido":

- Estilo de feedback ideal (frequência, público/privado, direto/construtivo).
- Tipo de tarefas em que o colaborador tende a prosperar.
- Tipo de tarefas que podem exigir mais apoio.
- Recomendação de par/mentor com perfil complementar.

### 11.5 Importante — disclaimers sempre visíveis

Em toda tela com resultado DISC, rodapé fixo:

> **Este perfil é CONTEXTO**, não critério de decisão. Use-o para planejar a entrevista e o onboarding, nunca para aprovar ou rejeitar o candidato. O perfil DISC é auto-relatado e pode variar com o momento de vida do candidato.

---

## 12. Integração com `vaga_testes_aplicaveis`

### 12.1 Regras de negócio

```
INSERT INTO vaga_testes_aplicaveis (vaga_id, tipo_teste, aplicar, peso, threshold_eliminatorio, ordem)
VALUES (
  :vaga_id,
  'disc',
  'obrigatorio' | 'opcional' | 'nao_aplicar',
  0..100,           -- peso relativo no score agregado (ver §12.2)
  NULL,             -- SEMPRE NULL para DISC (validado por trigger §9.4)
  :ordem_dentro_do_testes_async
);
```

### 12.2 Peso no score agregado (V2 — opcional)

No master PRD, `vaga_testes_aplicaveis.peso` permite calcular um score_agregado. Para DISC:

- V1: **peso sempre 0** — não entra no agregado. Evita interpretação errada.
- V2 (se/quando score agregado for implementado): permitir peso baixo (0–10) apenas se a vaga explicitamente justificar "fit comportamental" (ex: recepção de clínica — alto I pode ter peso 10 em "fit"; mas DISC ainda não elimina).
- V2 requer log obrigatório de justificativa em campo `config_justificativa` para auditoria.

### 12.3 Comportamento default do CRUD de vagas

Na tela de criação de vaga (`CriarEditarVagaPage`), toggle DISC:

- Default: **opcional** (candidato pode pular).
- Threshold: campo desabilitado/oculto para DISC (hardcoded NULL).
- Peso: default 0, slider trava em 10 com tooltip "DISC é contexto — use peso baixo".

---

## 13. LGPD

### 13.1 Base legal

- **Consentimento específico** (art. 7º, I, LGPD) para coleta e tratamento das respostas DISC, separado do consentimento geral de candidatura.
- **Legítimo interesse** (art. 7º, IX) NÃO é suficiente para dados comportamentais auto-relatados — usar consentimento.

### 13.2 Dados coletados

- Respostas brutas (tetrad → mais/menos) — **dado comportamental**, não dado sensível no sentido LGPD estrito (art. 5º, II), MAS **tratamento equiparado ao de dado sensível** por prudência.
- Não coletamos: dados biométricos, dados de saúde, dados de origem, religião.

### 13.3 Direitos do titular

| Direito | Implementação |
|---|---|
| Acesso | Candidato pode solicitar via RH; exportar JSON das respostas + score |
| Retificação | **Não aplicável** — auto-relato único no momento da candidatura |
| Eliminação | Ao eliminar candidatura (art. 18, VI), respostas DISC são deletadas (CASCADE já configurado no schema §9.2) |
| Portabilidade | Export JSON disponível sob solicitação |
| Revogação do consentimento | Disponível; invalida o score (marca `score_json.revogado=true`) mas preserva log de auditoria |

### 13.4 Retenção

- Respostas DISC: **2 anos** após fim do processo seletivo (ou até revogação). Alinhar com política geral de retenção de candidatos do sistema.
- Ao contratar: respostas migram para tabela de colaboradores com consentimento renovado no contrato de trabalho.

### 13.5 Compartilhamento

- Score DISC **não é exposto** em portal público, não vai para integradores externos (n8n, ATS externo) sem nova camada de consentimento.
- Gestor e RH internos têm acesso via RLS — log de cada acesso em `audit_log` (quem viu, quando).

### 13.6 Termo de consentimento (trecho)

> "Autorizo a Beauty Smile a tratar minhas respostas ao Questionário Comportamental DISC exclusivamente como contexto para a entrevista de seleção e eventual plano de integração pós-contratação. Estou ciente de que este questionário não é um teste psicológico regulamentado, não substitui avaliação psicológica profissional, e não será usado para aprovar ou rejeitar minha candidatura. Posso revogar este consentimento a qualquer momento contatando [e-mail DPO]."

---

## 14. Gaps e Decisões Pendentes

| # | Gap/Decisão | Owner | Bloqueia Fase? |
|---|---|---|---|
| G-01 | Contratar psicólogo consultor PJ para construção do banco (não é prática clínica — é consultoria de instrumento) | Cliente Beauty Smile | Fase 9.2 |
| G-02 | Lista inicial de ~150 adjetivos/fator validada | Psicólogo | Fase 9.2 |
| G-03 | Piloto com 20–30 colaboradores atuais — LGPD + consentimento para uso interno não-avaliativo | RH Beauty Smile | Fase 9.2 |
| G-04 | Decidir se "padrões clássicos" de 15 categorias entram em V1 ou V2 | Produto | Não bloqueia (default: V2) |
| G-05 | Revisão das 4×4 mensagens de entrevista por área (clínica, atendimento, gestão) — uma vaga operacional pode precisar de sugestões diferentes de uma gerencial | Psicólogo + Líder de Operações | V2 |
| G-06 | Validar com jurídico se o rótulo "Questionário Comportamental" é suficiente para evitar enquadramento como teste psicológico (Res. CFP 31/2022) | Jurídico/Compliance | Antes do go-live |
| G-07 | Rodar validação estatística (alfa de Cronbach por fator ≥ 0.6 desejável; correlação intra-tetrad baixa) após piloto interno | Psicólogo | Fase 9.2 |
| G-08 | Decidir se o candidato vê o próprio resultado (hoje: **não vê**) — pode mudar se houver demanda LGPD | Produto + Jurídico | V2 |
| G-09 | Definir política de reaplicação — pode o candidato refazer o DISC em nova candidatura após 6 meses? | Produto | V2 |
| G-10 | Mapear adjacência com ICAR (cognitivo), Big Five e Cultural — garantir que tempo total dos testes async cabe no SLA de 7 dias | Produto | Fase 9 |
| G-11 | UI do "Gerador de sugestões" — hoje template estático em tabela de apoio; avaliar GenAI assistida em V2 (com guardrails contra vieses) | Produto + Eng | V2 |
| G-12 | Auditar se Wiley/Persolog/Extended DISC já acionaram juridicamente sistemas brasileiros que usam banco próprio — benchmark de risco | Jurídico | Antes do go-live |

---

## 15. Referências

### Literatura acadêmica e base teórica

- Marston, W. M. (1928). *Emotions of Normal People*. Routledge.
- Zhang, B., Sun, T., Drasgow, F., et al. (2024). *Why Forced-Choice and Likert Items Provide the Same Information on Personality, Including Social Desirability*. PubMed (PMID 38756462). https://pmc.ncbi.nlm.nih.gov/articles/PMC11095325/
- Combrinck, C. (2024). *Not Liking the Likert? A Rasch Analysis of Forced-choice Format and Usefulness in Survey Design*. SAGE Open. https://journals.sagepub.com/doi/10.1177/21582440241295501
- Brown, A. & Maydeu-Olivares (2017). *Integration of the Forced-Choice Questionnaire and the Likert Scale: A Simulation Study*. Frontiers in Psychology. https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2017.00806/full

### Regulação brasileira

- [Sistema de Avaliação de Testes Psicológicos — SATEPSI/CFP](https://satepsi.cfp.org.br/)
- [Lista Completa de Testes SATEPSI](https://satepsi.cfp.org.br/lista_teste_completa.cfm)
- [Testes Favoráveis SATEPSI](https://satepsi.cfp.org.br/testesFavoraveis.cfm)
- Resolução CFP nº 31/2022 — Diretrizes para avaliação psicológica. https://atosoficiais.com.br/cfp/resolucao-do-exercicio-profissional-n-31-2022
- [Nota Técnica CFP sobre uso de instrumentos](https://satepsi.cfp.org.br/docs/notaTecnica.pdf)

### Histórico e variantes DISC

- [DISC assessment — Wikipedia](https://en.wikipedia.org/wiki/DISC_assessment)
- [History of the DISC model — Get Savvii](https://www.getsavvii.com/history-of-the-disc-model/)
- [William Marston, Father of DISC — DISC Insights](https://discinsights.com/pages/william-marston-disc)
- [DISC Background — Everything DiSC by Wiley](https://www.discprofiles4u.com/blog/2026/disc-background-and-how-everything-disc-by-wiley-is-different/)
- [Everything DiSC Content License Agreement (Wiley — público)](https://register.everythingdisc.com/Everything_DiSC_Content_License_Agreement.pdf)
- [Learn DiSC's history — Internal Change Timeline](https://internalchange.com/timeline-of-disc/)
- [DISC Profile Shapes — Discus Online](https://www.discusonline.com/en-us/udisc/contents_iv.html)

### Scoring e interpretação

- [DISC Assessment Scoring Guide — DISC+Plus](https://discplusprofiles.com/disc-assessment-scoring-guide/)
- [How to Interpret a DISC Assessment Chart — TestGorilla](https://www.testgorilla.com/blog/disc-assessment-chart/)
- [The DiSC Styles — DiSC Profile](https://www.discprofile.com/disc-styles)

### Sugestões de entrevista por perfil

- [An HR Manager's Guide to Using DISC Assessments — DISC+Plus](https://discplusprofiles.com/hr-managers-guide-disc-assessments/)
- [DiSC for Hiring — Everything DiSC by BYLD Group](https://everythingdisc.byldgroup.com/disc-for-hiring/)
- [The Right Way to Use DISC in Hiring — DISC+Plus](https://discplusprofiles.com/using-disc-in-hiring/)
- [DISC Interview Question: High C — Hire Possibilities](https://www.hirepossibilitiesseattle.com/blog/disc-interview-question-high-c)

### Bancos lexicais pt-BR (open-access)

- [EticaAI Linguistic Datasets for Portuguese](https://github.com/EticaAI/linguistic-datasets-portuguese)
- [Unitex-PT-BR — datasets-br](https://github.com/datasets-br/unitex-pt-br)
- [Lista de palavras do português brasileiro — pythonprobr](https://github.com/pythonprobr/palavras)
- [TEP — Thesaurus Eletrônico do Português (NILC/USP)](http://www.nilc.icmc.usp.br/tep2/)

### Benchmark mercado BR

- [Gupy — teste comportamental](https://www.gupy.io/)
- [Revelo — entrevista com gestor](https://blog.revelo.com.br/entrevista-de-emprego-com-gestor/)

---

## Changelog

| Data | Versão | Autor | Mudanças |
|---|---|---|---|
| 2026-04-19 | 0.1 | Produto + pesquisa web | Draft inicial, estrutura completa, pendente validação com psicólogo consultor |
