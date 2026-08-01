# RETEN-06 — Veredito sobre reusar (ou não) o padrão `retain_until` de `ai_call_logs`

**Data do veredito:** 2026-08-01
**Fase:** 43 — Consentimentos Honestos & Política de Retenção · Plano 43-02 (wave 1)
**Requirement:** RETEN-06 · **Critério de sucesso:** SC#4
**Estado do repositório no momento da medição:** nenhuma estrutura de retenção de candidato
existe ainda. Este arquivo é commitado **antes** de `supabase/migrations/20260801000002_*`
(matriz de retenção, plano 43-04). A ordem é o requirement, não uma cortesia editorial:
escrito depois, o veredito seria racionalização do que já foi construído.

Toda afirmação sobre o padrão vivo abaixo cita `arquivo:linha`. Nada aqui é estimado.

---

## 1. O padrão vivo, medido

`retain_until` existe hoje em **uma** tabela: `public.ai_call_logs` (Phase 27 / RF-PL-21).

| Dimensão | O que é, medido |
|---|---|
| **Forma** | Coluna **materializada**: `retain_until timestamptz NOT NULL` — `supabase/migrations/20260609000001_prompt_library_schema.sql:197` |
| **Quem preenche** | `computeRetainUntil()` em **TypeScript**, no caminho de INSERT da Edge Function — `supabase/functions/_shared/audit-logger.ts:103-106`, chamada em `:131`, gravada no objeto de insert em `:160` |
| **A regra** | `advance` → `NOW + 5 anos`; `reject` \| `hold` \| desconhecido → `NOW + 180 dias`. Os dois números são **constantes de código**: `RETAIN_ADVANCE_MS` (`audit-logger.ts:30`) e `RETAIN_DEFAULT_MS` (`:31`) |
| **Índice** | Parcial: `idx_ai_logs_retain_until ON public.ai_call_logs (retain_until) WHERE retain_until IS NOT NULL` — `20260609000001_prompt_library_schema.sql:208` |
| **Consumidor** | Cron `ai-logs-retention-cleanup` @ 02:00 diário — nasceu em `20260609000003_prompt_library_cron.sql:70-82`, **reescrito** por `20260730000005_p42_invent05_not_exists.sql:123-136` |
| **Como se muda a política HOJE** | **Editando TypeScript e redeployando a Edge Function.** Não há nenhum outro caminho: o valor é decidido no cliente da escrita, não no banco |
| **Documentação viva** | `COMMENT ON TABLE`: *"retain_until drives the retention purge cron"* — `20260609000001_prompt_library_schema.sql:223` |

O ponto que decide tudo o que vem abaixo está na penúltima linha da tabela: **a política de
retenção do `ai_call_logs` mora num arquivo `.ts` deployado, não em dado**.

---

## 2. VEREDITO: **NÃO REUSAR** para retenção de candidato

O padrão não é adotado para a matriz de retenção de candidaturas. Três razões, em ordem de peso.

### (a) O padrão exige DEPLOY para mudar a política — e o RETEN-02 exige o contrário, literalmente

O RETEN-02 diz **"alterável sem deploy"**. Mudar "180 dias" no padrão vivo significa editar
`audit-logger.ts:31` e redeployar a Edge Function. **O padrão vivo é a negação do requirement
que a fase existe para entregar.** Reusá-lo seria entregar, sob o nome do RETEN-02, exatamente
a propriedade que o RETEN-02 proíbe.

Esta razão sozinha encerra a decisão. As duas seguintes existem porque, mesmo que o RETEN-02
não existisse, o reuso continuaria errado — e é útil que isso esteja registrado.

### (b) `retain_until` congela a política no instante da escrita

Uma coluna materializada grava o resultado da política **vigente no momento do INSERT**. Numa
matriz editável por admin, isso produz uma tela que mente:

- O admin edita a janela de "rejeitado" de 24 para 12 meses.
- **Nenhuma linha existente muda.** Todas continuam carregando o prazo antigo, calculado no dia
  em que a candidatura entrou.
- A matriz vira **decoração**: ela afirma um prazo que o dado não obedece.

Descongelar exigiria `UPDATE` em massa sobre dado de candidato a cada edição da matriz — escrita
que **esta fase se proibiu por desenho** (a Phase 43 é declaradamente zero-destrutiva e
zero-reescrita sobre dado histórico). O padrão só funcionaria com a operação que a fase não
admite fazer.

### (c) A propriedade útil do congelamento já é entregue por outro mecanismo, NESTA MESMA FASE

O argumento legítimo a favor de materializar é probatório: *"quero saber qual prazo valia quando
a pessoa consentiu"*. Essa propriedade **já existe** e chegou pelo plano 43-01:

- `CONSENT-02` grava **versão + hash SHA-256 + timestamp** do texto exato que o candidato leu
  (`supabase/functions/_shared/consent-hash.ts`, colunas de prova em `public.autorizacoes`).
- O **teto de 24 meses é fixado pela própria copy consentida** (BD-1) — o número não é
  recomendação técnica, é o que a pessoa leu e aceitou, e o hash prova qual texto foi.

Materializar `retain_until` seria uma **segunda cópia da mesma verdade**, com risco de divergir
da primeira. Duas fontes para o mesmo fato é o defeito, não a redundância defensiva.

---

## 3. O que É reusado — isto não é rejeição em bloco

Reuse-first continua valendo. Do padrão vivo, três coisas são adotadas:

1. **O índice parcial como idioma.** `… WHERE <coluna> IS NOT NULL`
   (`20260609000001_prompt_library_schema.sql:208`) é a forma correta de indexar um predicado
   esparso de retenção, e a matriz nova segue esse idioma.

2. **A forma do cron da Phase 46:** `DELETE … WHERE <predicado> AND NOT EXISTS (<exceções>)`,
   copiada de `20260730000005_p42_invent05_not_exists.sql:123-136` — **não** da versão original
   de `20260609000003`.

3. **A lição embutida nessa reescrita: a lista de exceções tem de ser NULL-safe.** O cron original
   usava `id NOT IN (SELECT unnest(...))` (`20260609000003_prompt_library_cron.sql:74-80`); um
   único NULL no conjunto faz `NOT IN` retornar NULL para **toda** linha e o `DELETE` apaga zero —
   ou, no espelho oposto do mesmo predicado, deixa de proteger o que devia. Foi o defeito que o
   INVENT-05 da P42 corrigiu, trocando por `NOT EXISTS` com `l.id = ANY(d.ai_call_log_ids)`. A
   purga da Phase 46 nasce já com essa forma.

**O NOME não é reusado.** Uma coluna `retain_until` em `candidaturas` sugeriria semântica
materializada a quem lesse o schema, e induziria exatamente ao erro (b) — alguém confiaria que a
linha carrega o prazo vigente. O predicado novo é computado e é nomeado como tal.

---

## 4. A estrutura que substitui

**Predicado COMPUTADO**, não coluna materializada:

```
matriz de configuração (janela por estado da candidatura)  ⨝  data-âncora da candidatura
```

- A matriz é **dado editável** (tabela de config), entregue no plano **43-04**; a superfície de
  edição do admin, no **43-06** / `/admin/retencao`.
- O prazo de uma candidatura é derivado **na leitura**, cruzando o estado atual com a janela
  configurada e a data-âncora.
- **Consequência que resolve (a) e (b) de uma vez:** uma edição do admin passa a valer
  **imediatamente e uniformemente**, sem tocar em uma única linha de candidato. Sem deploy, sem
  `UPDATE` em massa, sem matriz decorativa.
- Nesta fase o predicado **não morde**: nenhum `DELETE`, nenhum cron ligado. A matriz nasce como
  dado e só passa a ter efeito na Phase 46.

---

## 5. Dependências explícitas da Phase 46 — registro, não lembrete em prosa

Duas condições que a Phase 46 **tem de satisfazer antes de ligar a purga**. Estão aqui porque
este arquivo é versionado e a prosa de um SUMMARY não é consultada por quem for executar a 46.

**D46-1 · A purga NÃO pode ser ligada com a matriz ainda no seed genérico.**
A Phase 43 semeia **todos** os estados no teto de 24 meses (BD-1), porque 24 meses é o teto já
consentido pela copy do cadastro — e porque retenção mais longa nunca apaga cedo demais. O número
fino por estado exige **parecer jurídico trabalhista**, e o operador tem de **confirmar os prazos
por estado** antes de qualquer predicado destrutivo executar. Ligar a purga sobre o seed genérico
apagaria dado segundo um número que ninguém validou.

**D46-2 · "Quem não autorizou a guarda do currículo tem janela mais curta" é decisão de POLÍTICA
e pertence à Phase 46, com o mesmo parecer.**
Nesta fase, `autorizacao_retencao_curriculo` é lido **exclusivamente como base legal citada** ao
candidato (SC#5) — nunca como encurtador de janela. Transformar um consentimento em redutor de
prazo é decisão de política com efeito destrutivo, e ela não foi tomada aqui.

---

## Rastro

| Item | Valor |
|---|---|
| Requirement | RETEN-06 |
| Critério de sucesso | SC#4 — veredito registrado **antes** de a estrutura nova existir |
| Plano | 43-02, wave 1, `depends_on: []` — a ordem é imposta pela estrutura de waves |
| Ameaça mitigada | T-43-07 (Repudiation): artefato datado e versionado, não decisão oral |
| Estrutura substituta | planos 43-04 (matriz) e 43-06 (`/admin/retencao`) |
| Efeito destrutivo | **nenhum nesta fase** — Phase 46, sob D46-1 e D46-2 |
