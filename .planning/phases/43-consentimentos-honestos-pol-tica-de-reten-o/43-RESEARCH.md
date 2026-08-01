# Phase 43: Consentimentos Honestos & Política de Retenção — Research

**Researched:** 2026-08-01
**Domain:** LGPD consent lifecycle (coleta → prova → revogação → enforcement) + config de retenção sem deploy, sobre React 18/Vite/TS + Supabase (Postgres, RLS, Edge Functions, Resend)
**Confidence:** HIGH para tudo que foi medido no repositório · MEDIUM para o estado vivo de PROD (RLS de `autorizacoes`, flags de tracking do Resend) — os dois exigem checkpoint do orquestrador antes de o plano fechar

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**BD-1 · Janela de retenção — semear TUDO no teto de 2 anos.**
Todos os estados da candidatura nascem com 2 anos. Razões, na ordem que importa:
1. **2 anos é o teto já consentido pela copy do cadastro** — não é recomendação técnica, é o que o
   candidato leu e aceitou. O ROADMAP exige que o seed seja documentado exatamente assim.
2. **Retenção mais longa nunca apaga cedo demais.** Um seed curto seria a única forma de esta fase
   causar dano, e ela é declaradamente zero-destrutiva.
3. **O número fino por estado precisa de advogado trabalhista, e só morde na Phase 46.** A Phase 43
   entrega o MECANISMO (RETEN-02: alterável por admin sem deploy). O parecer jurídico é
   **pré-requisito da Phase 46**, não desta.

⚠ **Consequência que o plano tem de carregar adiante:** a Phase 46 NÃO pode ligar a purga com a
matriz ainda no seed genérico sem que o operador confirme os prazos por estado. Registrar isso
como dependência explícita da 46, não como lembrete em prosa.

**BD-2 · `autorizacao_analise_video` — PARAR DE COLETAR.**
Sai do formulário e da copy. O sistema não tem análise de vídeo; pedir permissão para algo que não
se faz é exatamente a promessa órfã que o SC#3 manda eliminar.
**A COLUNA PERMANECE.** Dropar coluna é ação destrutiva e esta fase é zero-destrutiva por desenho.
Os valores históricos ficam intactos, com `COMMENT` explicando por que a coluna existe e não é mais
alimentada. O eventual `DROP` é decisão da **Phase 47**, junto com o zumbi `data_deletion_log`
(CONSOL-03), onde já existe portão destrutivo previsto.

**BD-3 · Rótulo do Art. 20 — REESCREVER EM LINGUAGEM SIMPLES.**
"revisão por pessoa natural" → linguagem que o candidato decodifica (ex.: "Pedir que uma pessoa
revise esta decisão"), **mantendo a citação do Art. 20 ao lado**. Um direito só é exercível na
medida em que o titular entende que ele existe; juridiquês é fricção sobre um direito.
**Três sítios vivos**, todos vistos pelo candidato ou pelo RH:
- `src/features/explicacao/components/SolicitarRevisaoCTA.tsx:47` (`cta:`)
- `src/features/explicacao/components/ExplicacaoCandidatoPage.tsx:46`
- `src/features/decisao/components/RegistrarDecisaoForm.tsx:189` (texto para o RH)
Os testes correspondentes pinam as strings — `SolicitarRevisaoCTA.test.tsx:35` e
`ExplicacaoCandidatoPage.test.tsx:138` — então a mudança aparece no diff em vez de escorregar.

### Claude's Discretion

Tudo o mais: forma da matriz de retenção, estrutura da tabela de config, desenho da superfície de
revogação, mecânica de versão+hash do texto de consentimento. Guiar-se pelo ROADMAP, pelos
critérios de sucesso e pelas convenções vivas do repositório.

### Deferred Ideas (OUT OF SCOPE)

- Número fino de retenção por estado → **Phase 46**, com parecer jurídico como pré-requisito.
- `DROP` da coluna `autorizacao_analise_video` → **Phase 47** (CONSOL-03), sob portão destrutivo.
- `RETEN-05` (retenção de `notificacoes_enviadas`) → **Phase 46**, por já ser `DELETE` por cron.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Descrição (REQUIREMENTS.md) | Onde a pesquisa apoia |
|----|-----------------------------|------------------------|
| CONSENT-01 | Checkboxes opcionais nascem desmarcados | §Q2 · **são 4 sítios de default, não 2** (dois no client, dois no servidor) |
| CONSENT-02 | Consentimento gravado com versão + hash + timestamp | §Q1 · colunas NULLable sem default em `autorizacoes`; fonte única do texto via arquivo JSON em `_shared/` |
| CONSENT-03 | `autorizacao_comunicacao` separado em transacional × marketing | §Q2 (forma da migration) + §Q3 (onde enforçar) |
| CONSENT-04 | Candidato revoga marketing pelo painel, honrado no envio | §Q3 · RLS de `autorizacoes` já prevê UPDATE own-row (⚠ confirmar vivo) |
| CONSENT-05 | `autorizacao_analise_video` resolvido | BD-2 travada · §Q2 (sítios de remoção) |
| CONSENT-06 | Click tracking desligado no Resend | §Q7 · **é setting de DOMÍNIO, não de código** — reporter já existe |
| RETEN-01 | Janela de retenção em tabela de config alterável sem deploy | §Q5 · molde `config_sla_revisao` (P42), não `config_sla_etapa` |
| RETEN-02 | Seed de 2 anos documentado como teto consentido | §Q5 · seed `ON CONFLICT DO NOTHING` + RPC de escrita com audit |
| RETEN-03 | `autorizacao_retencao_curriculo` citado como base legal | §Q6 · primeiro consumidor real; leitura own-row |
| RETEN-04 | Prévia read-only "estes N candidatos seriam purgados" | §Q8 · predicado versionado único, exposto só como agregado |
| RETEN-06 | Veredito registrado sobre reusar `retain_until` | §Q4 · **veredito: NÃO reusar** — com a razão medida |
</phase_requirements>

---

## Summary

Esta fase tem uma propriedade que a torna diferente de tudo o que o M8 fez até agora: **ela não
conserta um consumidor quebrado, ela cria o primeiro consumidor**. Medido em 2026-08-01 no
repositório: fora do próprio formulário de cadastro, nenhum arquivo de `src/` ou
`supabase/functions/` lê `autorizacao_comunicacao`, `autorizacao_retencao_curriculo` ou
`autorizacao_analise_video`. Os únicos sítios são o schema Zod, os `defaultValues`, o tipo do form,
dois mapas de campo→step, o schema espelhado da Edge Function e o `INSERT` de
`cadastrar-candidato`. Nenhuma leitura. Nenhuma decisão de negócio derivada. Três flags coletadas,
gravadas e nunca consultadas. `[VERIFIED: grep do repo]`

Três achados corrigem premissas que o ROADMAP e o CONTEXT carregavam:

1. **A tabela não é `candidatos`, é `public.autorizacoes`.** O ROADMAP justifica a ordem `43 → 44`
   dizendo que "CONSENT-02 adiciona colunas a `candidatos`". A tabela que governa consentimento é
   `autorizacoes` (`database.types.ts:368-431`), com FK própria para `candidatos` e para
   `auth.users`, e é ela que já carrega `policy_version`, `ip_aceite`, `user_agent_aceite`. O
   `docs/compliance/ddl-idiom-sweep.md:60-68` já tinha registrado essa mesma troca de tabela numa
   citação do FK-AUDIT. A ordem `43 → 44` continua correta pelo mesmo motivo (o snapshot da
   EXPORT-04 vê coluna nova), só que sobre outra tabela. `[VERIFIED: database.types.ts + migration]`
2. **`preferencias_notificacoes` NÃO é reuso.** É exclusivamente RH: PK-FK `usuario_rh_id` NOT NULL
   e colunas `email_novos_candidatos` / `whatsapp_urgentes` / `email_resumo_diario` — preferências
   de recrutador, não consentimento de titular. A UI-SPEC estava certa. §Q6. `[VERIFIED: types + smokes]`
3. **Não existe caminho de envio de marketing.** Nenhum. E não é só ausência de evento: o ledger
   `notificacoes_enviadas` tem `candidatura_id NOT NULL` e `candidato_id NOT NULL`
   (`20260721000001_notificacoes_enviadas.sql:78-80`), então a infraestrutura de envio é
   **candidatura-escopada por construção**. Um "aviso de nova vaga" não tem candidatura. Isso muda
   o que o SC#2 pode provar e é a decisão mais consequente do plano. §Q3. `[VERIFIED: migration + EF]`

**Primary recommendation:** modele o consentimento como **colunas NULLable sem default** em
`autorizacoes` (NULL = pré-enforcement, é o que os torna separáveis por dado), ponha o texto do
consentimento num **único arquivo JSON dentro de `supabase/functions/_shared/`** importado pelas
duas runtimes (a EF calcula o SHA-256 e é a única escritora), clone o molde de
`config_sla_revisao` (P42) — **não** o de `config_sla_etapa` — para a matriz de retenção com
escrita por RPC `SECURITY DEFINER` + `log_auditoria()` na mesma transação, e enforce marketing por
**trigger `BEFORE INSERT` no ledger de notificações**, que é o único ponto que nenhum caminho de
envio futuro consegue contornar.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Texto do consentimento (fonte do hash) | Arquivo compartilhado (`supabase/functions/_shared/`) | Browser (render) | Uma fonte, dois leitores. Duplicar o texto duplica o hash e o torna não-verificável |
| Cálculo + gravação do hash/versão | API / Edge Function (`cadastrar-candidato`) | — | A EF é a **única** escritora de `autorizacoes` hoje (`cadastrar-candidato/index.ts:288-306`). Hash vindo do cliente é atacante-controlado |
| Default desmarcado dos opcionais | Browser (RHF) **e** API (Zod da EF) | — | O `.default(true)` existe nos DOIS lados; mexer só no client deixa a coalescência `?? true` do servidor mandando |
| Revogação de marketing (escrita) | Browser → Postgres own-row (RLS) | — | Escrita own-row, sem privilégio. Espelha o idioma do `explicacaoService` |
| **Enforcement** do opt-out de marketing | Database (trigger no ledger) | API (EF) | Uma checagem só na EF é contornável pelo próximo caminho de envio. O trigger não é |
| Matriz de retenção (leitura) | Database (tabela config, RLS admin) | Browser (TanStack Query) | Config estática pequena, enum fechado |
| Matriz de retenção (escrita) | Database (RPC `SECURITY DEFINER` + audit) | Browser (diálogo) | O teto de 24 meses tem de ser server-enforced; UI é cosmética (D-13 / REVISAO-05) |
| Predicado de retenção (prévia + purga futura) | Database (função SQL versionada) | — | A prévia e o `DELETE` da Phase 46 têm de ser **a mesma definição**, ou divergem |
| Click tracking | Provedor externo (Resend, escopo de domínio) | — | Não existe campo de tracking na API de envio; é setting do domínio |

---

## Q1 — Versionamento + hash do texto de consentimento (CONSENT-02)

### Onde o texto vive hoje

Num array literal dentro do componente: `AutorizacoesStep.tsx:45-75`, `AUTORIZACOES:
AutorizacaoItem[]`, com `label` e `description` inline. O EF não conhece esse texto — grava só
`policy_version` (`cadastrar-candidato/index.ts:302`). `[VERIFIED: leitura do arquivo]`

`POLICY_VERSION = 'v1.0-2026-04'` existe **espelhada** em dois arquivos
(`src/features/cadastro/constants.ts:9` e `supabase/functions/_shared/constants.ts:8`) com um
comentário pedindo "bump os dois no mesmo commit" — e **nenhum teste que verifique isso**. É o
idioma do repo, e é um idioma frágil. `[VERIFIED]`

### O problema que o espelhamento causaria aqui

Com `POLICY_VERSION`, um espelho divergente produz um rótulo de versão errado — ruim, mas
detectável a olho. Com o **hash do texto de consentimento**, um espelho divergente produz uma linha
cujo hash não corresponde a texto nenhum: exatamente o defeito que o CONSENT-02 existe para tornar
impossível (UI-SPEC §abertura). O espelho é o caminho errado aqui.

### Recomendação — fonte única de verdade em arquivo JSON

Colocar o texto canônico em **`supabase/functions/_shared/consent-text.json`**, importado pelas
duas runtimes:

- **EF (Deno):** `import consentText from "../_shared/consent-text.json" with { type: "json" }`.
  Fica dentro de `supabase/functions/`, logo entra no bundle do deploy — o mesmo motivo pelo qual
  `_shared/email-templates.ts` funciona hoje. `[VERIFIED: EFs importam de _shared em produção]`
- **Client (Vite):** import relativo. `tsconfig.json:13` tem `"resolveJsonModule": true` e o Vite
  resolve JSON nativamente. `[VERIFIED: tsconfig]`

Se o import cross-boundary for rejeitado no plan-check (a `STATE.md:117` registra que **módulos TS**
não são importáveis cross `src/`↔`supabase/functions/` — a razão é o specifier `.ts`/`https://`,
que JSON não tem), o **fallback é espelhar + pinar por teste**, usando o idioma já vivo:
`supabase/functions/_shared/__tests__/strict-schema.test.ts:36-40` é uma sonda **Vitest** que lê
arquivo da EF com `node:fs` e asserta sobre o texto-fonte. Um teste equivalente que asserte
igualdade byte-a-byte dos dois JSONs fecha o buraco que o `POLICY_VERSION` deixou aberto por 4
meses. `[VERIFIED: arquivo lido]`

### Hash — quem calcula

**A EF, e só ela.** Razões, na ordem:
1. A EF é a única escritora de `autorizacoes` (`cadastrar-candidato/index.ts:288`). Não há caminho
   pelo qual o client escreva essa linha no cadastro.
2. Hash calculado no client e enviado no corpo é **atacante-controlado**: um cliente forjado grava
   qualquer hash. Como prova jurídica, um hash controlado pelo titular não prova nada.
3. `crypto.subtle.digest('SHA-256', …)` existe no runtime Deno sem dependência nova (invariante de
   zero-npm do M7/M8 preservada). `[ASSUMED — API padrão do Deno; não exercitada neste repo]`

Entrada do hash, conforme UI-SPEC §"Versão do texto de consentimento": `rótulo + descrição` de cada
consentimento, normalizados (`trim()` + `normalize('NFC')`), na ordem de renderização, mais a
constante de versão. Como a fonte é o JSON, a serialização canônica é determinística se o hash for
computado sobre `JSON.stringify` de um array de pares na ordem do arquivo — **nunca** sobre o
arquivo bruto (indentação e `\n` final viram parte do hash, e o formatador do repo os mudaria).

### Separação pré/pós-enforcement por DADO

A UI-SPEC fixa `CONSENT_TEXT_VERSION = 'v2-2026-08'` com `v1` reservado ao texto histórico. **O
schema consegue expressar isso, e a forma exata importa:**

```sql
-- ✅ CORRETO — pré-enforcement fica NULL, e NULL é o discriminador
ALTER TABLE public.autorizacoes
  ADD COLUMN consent_text_version text NULL,
  ADD COLUMN consent_text_hash    text NULL,
  ADD COLUMN consent_registrado_em timestamptz NULL;

-- ❌ ERRADO — back-fill silencioso: toda linha histórica passa a AFIRMAR
--    que leu o texto v2, que não existia quando ela foi criada
ALTER TABLE public.autorizacoes
  ADD COLUMN consent_text_version text NOT NULL DEFAULT 'v2-2026-08';
```

O `NOT NULL DEFAULT` é precisamente o erro que a própria tabela já cometeu:
`policy_version text NOT NULL DEFAULT 'v1.0-2026-04'` (`20260421000001:190`, confirmado vivo em
`ddl-idiom-sweep.md:46`). Toda linha anterior àquela migration ganhou `v1.0-2026-04`
retroativamente. Repetir isso com o hash destruiria o SC#1. `[VERIFIED: migration + sweep vivo]`

**Consequência de plano:** `v1` NÃO deve ser gravado em linha nenhuma. Ele fica como identificador
documental do texto que as linhas NULL de fato viram — e esse texto tem de ser **capturado agora**,
antes de `AutorizacoesStep.tsx:45-75` ser reescrito, senão a Phase 47 (página de transparência)
herda um `v1` que não corresponde a texto recuperável. Sugestão: `consent-text.v1-historico.json`
transcrito verbatim do arquivo vivo, marcado como não-editável, no mesmo commit da reescrita.

### ⚠ Achado colateral, e ele é sério

O `INSERT` em `autorizacoes` é **best-effort**: `cadastrar-candidato/index.ts:307-312` faz
`console.warn` e segue em frente se o insert falhar. Um cadastro pode existir **sem nenhuma linha
de consentimento**, e ninguém saberia. Para uma tabela cuja natureza é declarada
"prova de consentimento — preservação tem função probatória"
(`pii-inventory.yaml:139-140`), best-effort é a postura errada. `[VERIFIED: leitura do código]`

Isso não está em nenhum requirement da fase. **Recomendação:** o plano deve escolher
explicitamente entre (a) corrigir aqui — o consentimento passa a ser condição do cadastro, não
efeito colateral — ou (b) registrar como débito nomeado. Não deixar implícito: uma fase que se
chama "Consentimentos Honestos" fechar deixando o consentimento gravado em best-effort é o defeito
central do milestone dentro da fase que o combate.

---

## Q2 — Separar `autorizacao_comunicacao` em transacional × marketing (CONSENT-03) + os defaults (CONSENT-01)

### Os sítios de default são QUATRO, não dois

O CONTEXT nomeia dois (`candidatoSchema.ts:360-362` e `CadastroMultiStepForm.tsx:245-248`). Medido,
são quatro sítios de **default** e nove sítios de **campo**:

| # | Arquivo:linha | Natureza | Efeito se esquecido |
|---|---------------|----------|---------------------|
| 1 | `src/features/cadastro/schemas/candidatoSchema.ts:360-362` | Zod client `.default(true)` | Zod repõe `true` no parse |
| 2 | `src/features/cadastro/components/CadastroMultiStepForm.tsx:245-248` | `defaultValues` do RHF | Checkbox nasce marcado na tela |
| 3 | **`supabase/functions/_shared/schemas.ts:102-104`** | Zod **servidor** `.optional().default(true)` | **Servidor repõe `true` mesmo se o client mandar certo** |
| 4 | **`supabase/functions/cadastrar-candidato/index.ts:293-297`** | Coalescência `?? true` | Segundo cinto do servidor, idem |
| 5 | `src/features/cadastro/types/formTypes.ts:189-192` | Interface TS | Compilador |
| 6 | `src/features/cadastro/services/cadastroService.ts:368-371` | `FIELD_TO_STEP` | Erro de campo não navega ao passo |
| 7 | `src/features/cadastro/services/cadastroService.ts:405-408` | `FIELD_TO_STEP_PATH` | `setError` em path inexistente |
| 8 | `src/features/cadastro/components/steps/AutorizacoesStep.tsx:45-75` | Array `AUTORIZACOES` | A tela |
| 9 | `src/features/cadastro/services/__tests__/cadastroService.test.ts:103-106` | Fixture | Teste verde sobre forma morta |

`[VERIFIED: grep repo-wide]`

**O sítio 3 é o que decide o comportamento real.** `_shared/schemas.ts` usa
`.optional().default(true)`: se o client omitir o campo, o **servidor** o preenche com `true` antes
mesmo de o `?? true` da linha 293 rodar. Um plano que mexa só nos sítios 1 e 2 entrega um
formulário com o checkbox desmarcado e um banco com `true` gravado — o pior resultado possível,
porque parece corrigido.

Nota adicional: `_shared/schemas.ts:147` e `:235` são `.strict()`. Remover
`autorizacao_analise_video` do schema do servidor faz um client desatualizado que ainda mande o
campo receber **rejeição**, não strip. Isso é o comportamento certo (D-04/LGPD-01), mas o plano tem
de deployar a EF e o front na ordem certa ou aceitar uma janela de rejeição. `[VERIFIED]`

### Forma da migration para o split

A coluna está viva com linhas reais. Zero-destrutivo ⇒ **aditivo puro**, e a coluna antiga
permanece (mesma lógica de BD-2 para o vídeo).

```sql
-- ADITIVO. Sem DEFAULT: a ausência de valor é informação.
ALTER TABLE public.autorizacoes
  ADD COLUMN autorizacao_marketing_vagas boolean NULL;
```

**O transacional não vira coluna.** Ele não é consentimento: a base é o Art. 7º, V, e um campo
booleano para algo que ninguém pode desligar é a doença deste milestone em forma de schema (UI-SPEC
Invariante 3). Isso resolve por si a pergunta "qual valor as linhas existentes herdam para cada um
dos dois consentimentos": há **um** consentimento novo, não dois.

**Qual valor as linhas existentes herdam em `autorizacao_marketing_vagas`: NULL.** E é a única
resposta honesta disponível, exatamente pela razão que o SC#1 nomeia — `.default(true)` em três
sítios torna `true` indistinguível de "não desmarcou". Um back-fill
`SET autorizacao_marketing_vagas = autorizacao_comunicacao` propagaria um consentimento que
provavelmente ninguém deu, para um canal (divulgação de vagas) que **é** marketing sob a LGPD e
exige consentimento inequívoco (Art. 5º, XII). NULL significa "nunca foi perguntado desta forma", e
o enforcement do §Q3 trata NULL como **não autorizado** — fail-closed.

⚠ **Consequência que o plano deve declarar em voz alta:** depois desta fase, **zero** candidato
histórico está autorizado a receber divulgação de vagas. Isso não é regressão, é a correção. Se o
operador quiser reconquistar essa base, o caminho é uma campanha de re-opt-in — que é feature de
outro milestone e depende justamente do canal de marketing que não existe.

`autorizacao_comunicacao` permanece com `COMMENT` explicando que ela passou a designar apenas o
canal transacional (sem opt-out, Art. 7º V) e que a parte de marketing migrou para a coluna nova.
Sem `DROP`, sem `UPDATE` em massa.

### Migration — idioma obrigatório do repo

`ADD COLUMN` **puro**, sem `IF NOT EXISTS`. O `docs/compliance/ddl-idiom-sweep.md` mediu 7/7 landed
e o idioma não silenciou nada — mas o mecanismo continua real (um `ADD COLUMN IF NOT EXISTS` sobre
coluna pré-existente vira no-op e silencia a cláusula junto). Colunas novas devem falhar alto se
já existirem. Precedente: `20260721000001:35-37` ("sem `IF NOT EXISTS` … contra um banco que já tem
a tabela este arquivo DEVE falhar alto"). `[VERIFIED: sweep + migration P37]`

---

## Q3 — Onde o opt-out de marketing é ENFORÇADO (SC#2)

### O caminho de envio, traçado

```
trg_notif_confirmacao   (AFTER INSERT candidaturas)            ─┐
trg_notif_transicao     (AFTER INSERT historico_candidatura)   ─┼─ net.http_post (Bearer do Vault)
trg_notif_convite       (AFTER INSERT agendamentos_entrevista) ─┤        │
trg_notif_revisao_respondida (42-08, pendente de apply)        ─┘        ▼
                                                       EF notificar-candidato
                                                                │
                        ┌───────────────────────────────────────┤
                        │ 1. guards (elegibilidade, knockout)   │
                        │ 2. resolve candidato/candidatura      │
                        │ 3. CLAIM: INSERT notificacoes_enviadas│ ← ponto de estrangulamento
                        │ 4. renderarEmail                      │
                        │ 5. fetch api.resend.com/emails        │
                        └───────────────────────────────────────┘
```
`[VERIFIED: 20260726000001_p39_rewire_triggers_aposenta_n8n.sql:114-233 + notificar-candidato/index.ts:262-390]`

### Classificação dos eventos vivos

O vocabulário fechado é `EVENTO_MAP` (`notificar-candidato/helpers.ts:32-41`), derivado num único
literal e pinado por `__tests__/vocabulario-eventos.test.ts`. O CHECK vivo do banco carrega **seis**
valores (os 5 do candidato + `revisao_solicitada`, que é do RH e consumido por `notificar-rh`).

| Evento | Template | Classe | Base legal |
|--------|----------|--------|-----------|
| `confirmacao` | `candidatura_recebida` | **transacional** | Art. 7º, V — procedimento preliminar ao contrato |
| `avanco` | `avaliacao_liberada` | **transacional** | idem |
| `convite` | `convite_entrevista` | **transacional** | idem |
| `decisao` | `decisao_final` | **transacional** | idem |
| `revisao_respondida` | `revisao_respondida` | **transacional** | Art. 20 — resposta a exercício de direito |
| `revisao_solicitada` | *(EF `notificar-rh`)* | **interno** | não vai ao titular |

**Os 5 são transacionais. Nenhum é marketing. Hoje não existe evento de marketing — e a afirmação é
mais forte do que "ninguém escreveu ainda":** `notificacoes_enviadas` exige
`candidatura_id uuid NOT NULL REFERENCES candidaturas(id)` e `candidato_id uuid NOT NULL`
(`20260721000001:78-80`). Um aviso de nova vaga não tem candidatura à qual se prender. A
infraestrutura de envio deste sistema é **candidatura-escopada por construção**, e portanto
estruturalmente incapaz de um envio de marketing. `[VERIFIED: DDL + EF]`

### O que o SC#2 pode, então, provar — e as opções

O SC#2 exige "envio real bloqueado, não leitura de flag". Com zero caminhos de marketing, um plano
ingênuo produz um dos dois fracassos: ou constrói um canal de marketing inteiro fora de escopo, ou
entrega um `if (!consent) return` que nada exercita — a promessa órfã, de novo, na fase que existe
para matá-la.

**Recomendação (Opção A): pôr o guard no ponto de estrangulamento, no BANCO, e provar por escrita
real recusada.**

```sql
-- 1. A autoridade única. STABLE, DEFINER, search_path vazio (idioma da P42).
CREATE FUNCTION public.pode_receber_marketing(p_candidato_id uuid) RETURNS boolean ...
--    Lê autorizacoes.autorizacao_marketing_vagas. NULL ⇒ false (fail-closed).

-- 2. A classificação, como DADO e não como if espalhado.
--    Ou coluna em uma tabela de classes de evento, ou função pura evento→classe.

-- 3. O guard: BEFORE INSERT em notificacoes_enviadas.
--    Se a classe do evento é 'marketing' e pode_receber_marketing() é false ⇒ RAISE.
```

Por que aqui e não na EF:
- **Um `if` na EF é contornável pelo próximo caminho de envio.** Este repo já viveu isso: a P39
  precisou de DROP-and-CREATE de triggers no mesmo phase porque havia 3+ triggers n8n dormentes e
  um disparo por env-var em `submit-candidatura` (`STATE.md:209`). Múltiplos emissores é o estado
  normal deste sistema, não a exceção.
- **`service_role` bypassa RLS, mas NÃO bypassa trigger.** O claim da EF roda com service_role
  (`notificar-candidato/index.ts:270-290`), então RLS não serve de guard aqui — trigger serve.
- **É provável hoje, com escrita real e zero risco:** um `INSERT` de teste com evento de classe
  marketing dentro de uma transação com `ROLLBACK` recebe a exceção. Isso é envio real bloqueado
  no ponto onde todo envio é registrado, não leitura de flag. Idioma já usado nos smokes
  `supabase/tests/*.sql` (gate-GUC, zero escrita persistida).
- **Não é promessa órfã, é proibição.** A Invariante 1 da UI-SPEC proíbe prometer o que nada
  executa. Um guard que **recusa** é o oposto: ele executa exatamente o que afirma, e afirma um
  "não".

Custo honesto da Opção A: acrescenta ao CHECK do ledger um valor de evento que nenhum trigger
emite. Precedente exato de que isso é aceitável neste schema: `revisao_solicitada` **já** está no
CHECK e **não** está em `EventoLedger` — vocabulário do banco maior que o da EF é o estado vivo
(`helpers.ts:17-22`). O plano deve documentar o valor como "vocabulário reservado com guard vivo",
nunca como "suporte a marketing".

**Opção B (fallback, mais fraca):** apenas registrar a classificação em código
(`CLASSE_EVENTO: Record<EventoLedger, 'transacional'|'marketing'>`), pinar por teste, e declarar no
VERIFICATION que a metade "envio bloqueado" do SC#2 não é demonstrável nesta fase. Honesta, mas
**não satisfaz o critério como está escrito**. Se o plano for por aqui, o SC#2 tem de ser
reescrito com o operador, não silenciosamente reinterpretado.

⚠ **Ordem obrigatória (UI-SPEC §Regra do rodapé, item 3):** nenhum rodapé de e-mail pode oferecer
descadastro antes de `/candidato/privacidade` estar viva. O rodapé transacional vivo do
`layoutBase` (`_shared/email-templates.ts`) permanece **verbatim**, sem linha de descadastro — o
transacional não tem opt-out (Art. 7º V, travado no M7).

---

## Q4 — Veredito sobre reusar `retain_until` de `ai_call_logs` (RETEN-06 / SC#4)

**Este veredito tem de estar escrito ANTES de a estrutura nova existir.** Ele é o requirement,
não um comentário sobre ele.

### O padrão vivo, medido

| Propriedade | Estado vivo | Evidência |
|-------------|-------------|-----------|
| Forma | Coluna **materializada** `retain_until timestamptz NOT NULL` | `20260609000001_prompt_library_schema.sql:197` |
| Quem preenche | `computeRetainUntil(recommendation)` em TypeScript, no INSERT | `_shared/audit-logger.ts:100-131,160` |
| Regra | advance → NOW + 5 anos; demais → regra fixa em código | `audit-logger.ts:100` |
| Índice | `idx_ai_logs_retain_until` parcial `WHERE retain_until IS NOT NULL` | `:208` |
| Consumidor | cron `ai-logs-retention-cleanup` @ 02:00, `DELETE … WHERE retain_until < now()` | `20260609000003_prompt_library_cron.sql:70-82` |
| Como se muda a política | **editar TS + deploy da EF** | `audit-logger.ts` |

### Veredito: **NÃO REUSAR** para retenção de candidato.

Três razões, em ordem de peso:

1. **O padrão exige deploy para mudar a política — RETEN-02 exige o contrário.** A regra vive em
   `audit-logger.ts:100-131`. Alterar "5 anos" é editar TypeScript e redeployar. O requirement
   RETEN-02 diz literalmente "alterável sem deploy". O padrão vivo é a negação do requirement.
2. **`retain_until` congela a política no momento da escrita — e um `UPDATE` para descongelá-la
   seria mutação em massa de dado de candidato numa fase declarada zero-destrutiva.** Se
   `candidaturas` ganhasse `retain_until` semeado em 24 meses, uma edição posterior da matriz pelo
   admin **não afetaria nenhuma linha existente**: a matriz viraria decoração e a UI mentiria. Para
   não mentir, a edição teria de disparar um `UPDATE` em toda a base de candidaturas — o tipo de
   escrita que o portão de fase destrutiva do M8 existe para gatear, e que esta fase se proibiu
   (`43-CONTEXT.md:14-17`).
3. **A propriedade útil do congelamento já é fornecida por outro mecanismo nesta mesma fase.** O
   argumento a favor de materializar é "guardar a política vigente quando o dado foi coletado". O
   CONSENT-02 grava exatamente isso — versão + hash + timestamp do texto que o titular leu — e o
   teto de 24 meses é fixado pela própria copy consentida (BD-1). Materializar `retain_until`
   seria uma segunda cópia da mesma verdade, com risco de divergir da primeira.

### O que **É** reusado do padrão (reuse-first, não rejeição em bloco)

- O **índice parcial** como idioma (`WHERE … IS NOT NULL`), quando houver coluna a indexar.
- A **forma do cron da Phase 46**: `DELETE … WHERE <predicado> AND id NOT IN (<exceções>)`
  (`20260609000003:75-82`) é o molde direto — inclusive a lição de que a lista de exceções tem de
  ser NULL-safe (o INVENT-05 da P42 corrigiu justamente esse defeito na outra metade do predicado,
  `20260730000005:78`).
- O **nome não** é reusado: uma coluna `retain_until` em `candidaturas` sugeriria semântica
  materializada e induziria ao erro descrito acima.

**Estrutura recomendada em vez dela:** predicado **computado** = matriz de config (por estado) ⨝
data-âncora da candidatura. Uma edição do admin passa a valer **imediatamente e uniformemente**,
sem tocar em uma única linha de candidato. Essa é a propriedade que RETEN-02 pede e que
`retain_until` não tem. §Q8.

---

## Q5 — A matriz de retenção como config editável sem deploy (RETEN-01/02)

### O precedente certo é `config_sla_revisao` (P42), não `config_sla_etapa` (P37)

O CONTEXT/ROADMAP apontam `config_sla_etapa` como o análogo óbvio. **Ele é o análogo errado, e a
Phase 42 já documentou por quê**, in loco:

> `config_sla_etapa` tem leitura **PÚBLICA** por design (`{anon, authenticated}`, `USING (true)`)
> porque a P37 a construiu para o painel do CANDIDATO. Copiar aquela policy poria este limiar ao
> alcance do papel anônimo… — `20260730000001_p42_revisao_art20.sql:434-441` `[VERIFIED]`

`config_sla_etapa` (`20260721000002:54-76`):
- PK = valor do enum `etapa_processo`, 5 colunas, `atualizado_em` com trigger
- RLS: **uma** policy `SELECT TO anon, authenticated USING (true)` — public-read
- Escrita: **nenhuma policy** → só migration / service_role
- Seed 8/8 `ON CONFLICT (etapa) DO NOTHING`, jamais upsert

`config_sla_revisao` (`20260730000001:443-511`) reusa o **padrão** e troca a RLS por
`SELECT TO authenticated USING (role IN ('rh','administrador'))`, sem policy de escrita, com
`CONSTRAINT ck_…` de coerência, `COMMENT` que nomeia o seed como decisão do operador e **não**
recomendação, e trigger `tocar_atualizado_em()` reusada (não redefinida).

**A matriz de retenção deve clonar `config_sla_revisao`** — RLS restrita, seed
`ON CONFLICT DO NOTHING`, `COMMENT` que enquadra o número como teto consentido.

### O ponto onde a matriz PRECISA divergir do precedente

`config_sla_revisao` diz explicitamente: *"Alterar o limiar é operação de banco, não de aplicação —
e é justamente isso que o torna alterável SEM DEPLOY (um UPDATE resolve)"* (`:454-456`).

**Isso não satisfaz RETEN-02.** O requirement e a UI-SPEC (`/admin/retencao`, diálogo "Editar
janela de retenção", toast "Janela de retenção atualizada.") exigem que **um administrador** altere
pela tela. Logo a matriz precisa de caminho de escrita que `config_sla_revisao` não tem.

**Recomendação: escrita por RPC `SECURITY DEFINER`, não por policy de `UPDATE`.** Molde vivo:
`gerir_usuario_rh_mutacao` (`20260713000003_usr_rh_mutacao_rpc.sql:100-145`), que faz
mutação + `PERFORM public.log_auditoria(...)` **na mesma transação** — "a mudança e a linha de
auditoria commitam ou revertem juntas" (`:139`). Isso entrega de uma vez:

- **Teto de 24 meses server-enforced.** A UI-SPEC diz que o cap na tela é cosmético e "quem impede
  de verdade é o servidor" (mesmo modelo do D-13 / guard REVISAO-05). Um `CHECK (janela_meses
  BETWEEN 1 AND 24)` na tabela + validação na RPC dá as duas camadas.
- **Trilha de auditoria** que a copy do diálogo promete ("A alteração fica registrada na trilha de
  auditoria") — e a promessa passa a ter código que a executa, que é a regra do milestone.
  `log_auditoria` é `SECURITY DEFINER` com owner `BYPASSRLS`, então a linha sobrevive ao REVOKE de
  INSERT que a P28 aplicou (`20260713000004:49`). Assinatura verbatim em
  `20260713000003:38-42`. `[VERIFIED]`
- **Guard de papel no servidor**, não na tela — o idioma da P42 (`42501` se o papel não for
  `administrador`), coerente com `.planning/todos/pending/42-anon-execute-definer-sistemico.md`
  (⚠ o plano deve conferir esse todo: `REVOKE … FROM PUBLIC` sem `FROM anon` foi um defeito real
  medido na 42-06; a RPC nova precisa do REVOKE completo).

### Chave da matriz — recomendação com o tradeoff exposto

A UI-SPEC (E6) deixa aberto entre `status_candidatura` (5 valores, `database.types.ts:5319`) e
`etapa_processo` (8 valores, `:5290`).

**Recomendo `etapa_processo`.** Razões:
1. É a chave que `config_sla_etapa` já usa — coerência com o único precedente de config por estado
   de funil neste banco.
2. `candidaturas.etapa_atual` é **NOT NULL** (`database.types.ts:942`), então toda candidatura mapeia
   para uma linha da matriz; nenhuma cai num buraco silencioso.
3. `historico_candidatura` registra as transições de etapa (`etapa_de`/`etapa_para`/`criado_em`,
   `:2073-2083`), o que dá uma **data-âncora defensável** por estado: o instante em que a
   candidatura entrou na etapa atual. Não existe equivalente para `status`.
4. Granularidade de 8 é o que permite ao advogado da Phase 46 diferenciar `rejeitado` de
   `aprovado` de `triagem` — que é o ponto inteiro de a matriz existir.

Tradeoff a registrar: `etapa_processo` mistura etapa de funil com desfecho (`aprovado`/`rejeitado`
são valores do mesmo enum). Se a Phase 46 precisar de um eixo ortogonal (ex.: "candidatura
cancelada pelo titular"), a matriz precisará de segunda dimensão. Aceitável — a alternativa
(`status_candidatura`) tem o mesmo problema e menos granularidade.

### Precedente adicional que vale citar na tela

`configuracoes_empresa.dias_retencao_logs` já é config-de-retenção-sem-deploy vivo, lido por
`limpar_logs_antigos()` (`20260713000004:64-68`, default 730 dias = 2 anos). É a prova de que o
padrão "número de retenção em tabela, lido por rotina" já existe neste banco — e o número já é
2 anos. `[VERIFIED]`

---

## Q6 — `preferencias_notificacoes`: inspecionada. **Veredito: NÃO é reuso.**

A nota de escopo do ROADMAP manda inspecionar antes de projetar. Feito, contra
`database.types.ts:2690-2745` e os smokes de RLS.

| Evidência | O que diz |
|-----------|-----------|
| `usuario_rh_id: string` (NOT NULL, no `Insert`) | A linha pertence a um **usuário de RH**, não a um candidato |
| Colunas | `email_novos_candidatos`, `email_testes_completos`, `email_resumo_diario`, `email_resumo_semanal`, `email_entrevistas_agendadas`, `whatsapp_*`, `notificacoes_app` | Todas são preferências de **recrutador** sobre eventos de trabalho |
| `trigger_criar_preferencias_padrao` | AFTER INSERT em `usuarios_rh` cria a linha filha automaticamente — `supabase/tests/usr_rh_seg02_smoke.sql:58`, `perfil_rh_seg03_smoke.sql:71` |
| `created_by` / `updated_by` → `auth.users` | Origem da menção no `FK-AUDIT-LIVE.md:61` que gerou a nota de escopo |
| `deleted_at` | Soft-delete, alinhado ao ciclo de vida de `usuarios_rh` |

**A UI-SPEC está CORRETA** ao reportá-la como RH-only com FK `usuario_rh_id`. `[VERIFIED]`

**Correção do achado que originou a nota:** o `FK-AUDIT-LIVE.md:61` supôs que a tabela pudesse ser
"uma estrutura de preferências não utilizada, análoga aos checkboxes coletados e nunca lidos". Não
é análoga e **não** está órfã da mesma forma — ela é populada por trigger e pertence a outra
persona. A analogia era plausível pelo nome e falsa pelo conteúdo.

Consequência de plano: a superfície de revogação do candidato lê e escreve **`autorizacoes`**
own-row. Nenhuma tabela nova de preferências é necessária, e reusar esta introduziria uma FK
candidato→`usuarios_rh` que não faz sentido nenhum.

⚠ **Verificação pendente (checkpoint do orquestrador):** `docs/RLS_POLICIES.md:158-162` (datado
2025-11-13) registra **3 policies** em `autorizacoes`: candidato lê own, RH lê todas, **candidato
faz UPDATE own**. Nenhuma dessas policies aparece em `supabase/migrations/` — como ~40 tabelas
legadas, o DDL vive fora do ledger (`pii-inventory.md:14`). Se a policy de UPDATE existir viva, a
revogação de marketing é escrita own-row direta por PostgREST, sem RPC. Se **não** existir, o
CONSENT-04 precisa de RPC `SECURITY DEFINER` own-row (idioma de `solicitar_revisao_decisao`,
[Phase 42 / 42-11] em `STATE.md:172`). **O plano tem de ramificar aqui, e a medição é uma consulta
a `pg_policies` — não uma leitura de doc de 2025.** `[CITED: docs/RLS_POLICIES.md — não verificado
contra catálogo vivo]`

---

## Q7 — Click tracking do Resend (CONSENT-06 / SC#3)

### O fato técnico

Tracking de abertura e clique no Resend é **configuração de DOMÍNIO**, não parâmetro de envio.
Não existe campo de tracking no corpo de `POST /emails`. `[CITED: resend.com/docs/dashboard/domains/tracking]`

- **Padrão:** *"Open and click tracking is disabled by default for all domains."*
  `[CITED: resend.com/docs/dashboard/domains/introduction]`
- **Como desligar:** dashboard (aba Configuration/Tracking do domínio) **ou** programaticamente
  `PATCH /domains/{id}` com `{ "click_tracking": false, "open_tracking": false }`.
  `[CITED: resend.com/docs — PATCH /domains/{id}]`
- **Como verificar:** `GET /domains/{id}` devolve `open_tracking` / `click_tracking`.

### Resposta precisa à pergunta

**Não é mudança de código.** `construirCorpoResend` (`notificar-candidato/helpers.ts:92-111`)
monta `{from, to, reply_to, subject, html, attachments?}` — não há campo de tracking a remover, e
`grep -rni "tracking" supabase/functions/` retorna **zero**. Alterar o corpo não muda nada.
`[VERIFIED: grep + leitura]`

**É mudança de provedor (dashboard ou PATCH), e verificação de provedor.** E a verificação **já tem
ferramenta neste repositório**:

`scripts/check-resend-dominio.mjs` — reporter opt-in, read-only por padrão, criado na Phase 36
justamente para isto. O docblock lista como item 3 do que reporta:
*"`open_tracking` / `click_tracking` (both expected `false` — RESEARCH § Q1)"* (`:25`). A checagem
vive em `:166-182`. `[VERIFIED: leitura do arquivo]`

```bash
RESEND_API_KEY=<chave> npm run check:resend-dominio
```

### ⚠ Armadilha real do reporter — e ela reprova o SC#3 se não for tratada

O script trata um flag **ausente** como não-violação, apenas emitindo `… not reported by this API
version` e setando `trackingConfirmedOff = false` sem falhar (`:169-176`). A escolha é defensável
(um checker permanentemente vermelho é ignorado — `:160-163`), mas **"não reportado" não é
"verificado no provedor"**. O SC#3 exige confirmação positiva.

**Recomendação para o plano:**
1. Rodar o reporter e capturar o output **datado**.
2. Se sair `✓ click_tracking: false` e `✓ open_tracking: false` → SC#3 fechado por API, com
   evidência.
3. Se sair `… not reported` → **não é passe**. Fechar por leitura direta do dashboard (checkpoint
   humano do Fernando) com data e o que foi visto, ou por `GET /domains/{id}` bruto via `curl`.
4. Se sair `✗ …: true` → o operador desliga no dashboard. **Não** ligar isso ao script: o
   `check-resend-dominio.mjs` é read-only por decisão de segurança (`:14-19`, o único caminho
   state-changing é `--verify`), e o plano não deve erodir essa postura para poupar um clique.

**Ganho colateral:** isso fecha a metade "tracking desligado" do **UAT-36-1**, que segue `partial`
desde o encerramento do v7.0 (`STATE.md:256`).

Nota de escopo: `cost-alerter/index.ts:216` também envia via Resend com chave em env secret da EF
(divergência rastreada em `.planning/todos/pending/36-resend-chave-divergencia.md`). É e-mail
interno de custo, não superfície de candidato — fora do CONSENT-06, mas o tracking é por domínio,
então se o remetente for o mesmo domínio a configuração o cobre de graça.

---

## Q8 — A prévia read-only (RETEN-04 / SC#5)

### O precedente que a Phase 42 acabou de estabelecer

`docs/compliance/sql/04-invent05-blast-radius.sql:19-29` fixou a regra em prosa executável:

> **EXECUTAR DUAS VEZES — E AS DUAS TÊM DE SER ESTA MESMA CONSULTA.** … Se as duas medições não
> forem a MESMA consulta, o antes/depois não prova nada: qualquer diferença observada passa a ter
> duas explicações possíveis … É por isso que este arquivo é versionado em vez de a consulta ser
> digitada duas vezes. `[VERIFIED]`

E a P42 foi além: a fidelidade do corpo do cron foi asserida por **md5**, não por string literal
(`STATE.md:184`), porque transcrever o corpo esperado traz de volta o sítio de drift.

### Recomendação — uma definição, duas leituras, e a prévia nunca vê ids

```
public.candidaturas_alem_da_janela()          ← A ÚNICA DEFINIÇÃO DO PREDICADO
  RETURNS TABLE (candidatura_id uuid, candidato_id uuid, etapa public.etapa_processo)
  STABLE, SECURITY DEFINER, search_path = ''
  REVOKE ALL FROM PUBLIC, anon, authenticated   ← ninguém do cliente a chama
        │
        ├──► public.previa_retencao()           ← Phase 43 (esta fase)
        │      RETURNS TABLE (etapa, candidaturas_afetadas bigint, candidatos_afetados bigint)
        │      SÓ COUNT/GROUP BY. Zero id, zero nome, zero e-mail.
        │      GRANT EXECUTE TO authenticated + guard de papel administrador (42501)
        │
        └──► (Phase 46) DELETE … WHERE id IN (SELECT candidatura_id FROM …)
               consome A MESMA função. Não pode divergir porque não há segunda cópia.
```

Por que esta forma e não "duas queries que a gente mantém iguais":
- A UI-SPEC §Prévia, regra 1, proíbe a prévia identificar candidato ("uma tela que enumera pessoas
  prestes a serem apagadas é superfície de exfiltração de PII construída sem necessidade"). Com o
  `REVOKE` na função de baixo nível, a proibição é **estrutural**, não confiada à camada de
  apresentação.
- O `PURGA-02` da Phase 46 exige "dry-run pela MESMA query do delete real". Se a função nascer aqui,
  a Phase 46 herda o requirement satisfeito por construção em vez de reproduzi-lo.
- **Gate de não-divergência, herdado do 42-12:** um smoke que assere `md5(prosrc)` de
  `candidaturas_alem_da_janela` contra um valor pinado, mais a asserção de que
  `pg_get_functiondef(previa_retencao)` **contém** a chamada à função de baixo nível. Se alguém
  reescrever a prévia com um predicado próprio, o smoke reprova.

### Três decisões substantivas que o predicado exige — e que precisam de resposta explícita

1. **Data-âncora.** Recomendação: `COALESCE(` último `historico_candidatura.criado_em` cuja
   `etapa_para = candidaturas.etapa_atual`, `candidaturas.data_decisao_final`,
   `candidaturas.updated_at`, `candidaturas.data_candidatura` `)` — nesta ordem, com o COALESCE
   documentado no `COMMENT` da função. `data_candidatura` é NOT NULL, então a ladeira nunca resolve
   para NULL (o modo de falha que o INVENT-05 corrigiu do outro lado).
2. **"N candidatos" ≠ "N candidaturas".** Um candidato pode ter várias candidaturas. Contar
   `candidaturas` e chamar o número de "candidatos" seria inflar a prévia. Recomendação: a coluna
   por estado conta **candidaturas**; o **Total** conta `COUNT(DISTINCT candidato_id)` **de
   candidatos cujas candidaturas estão TODAS fora da janela** — porque um candidato com uma
   candidatura ativa não seria purgado por nenhuma definição sã. A copy da UI-SPEC diz
   "{Estado} · {n} candidatos" na linha e "Total: {n} candidatos"; o plano deve alinhar o rótulo da
   linha ao que ela realmente conta, ou ajustar a UI-SPEC. **Não deixar a discrepância implícita.**
3. **`autorizacao_retencao_curriculo` NÃO entra no predicado desta fase.** Ele é lido como *base
   legal citada* na superfície do candidato (RETEN-03), não como encurtador de janela. Encurtar a
   janela de quem não autorizou faria a prévia mostrar números altos e alarmantes numa fase
   zero-destrutiva, e a decisão "não autorizou ⇒ retenção = duração do processo" é decisão de
   política que pertence à Phase 46 com o parecer jurídico (BD-1). **Registrar como dependência
   explícita da 46.**

### Guardas de segurança que a prévia herda

- **`flagged_for_review` não protegido da purga** — item vivo em
  `.planning/todos/pending/42-flagged-for-review-nao-protegido-da-purga.md`. O predicado nascendo
  agora é o lugar certo para a lista de exceções nascer junto, mesmo que a purga não rode.
- **Idioma de exceção NULL-safe**: `id NOT IN (SELECT …)` contra conjunto com NULL devolve
  desconhecido e o registro escapa. Foi exatamente o INVENT-05. Usar `NOT EXISTS`.
  `[VERIFIED: 20260730000005:78 + STATE.md:183]`

---

## Standard Stack

**Zero dependência npm nova. Zero extensão Postgres nova.** Invariante herdada do M7 e reafirmada
para o M8 (`STATE.md:109`), e a UI-SPEC §Registry Safety a confirma para o front.

### Core (tudo já vivo no projeto)

| Item | Versão | Papel nesta fase | Por que é o padrão |
|------|--------|------------------|--------------------|
| React 18 + Vite + TS strict | vivo | 2 telas novas | Stack do projeto |
| TanStack Query v5 | vivo | `usePrivacidade`, `useMatrizRetencao`, `usePreviaRetencao` | Estado servidor, chaves hierárquicas |
| React Hook Form + Zod | vivo | Diálogo de edição de janela + schema do cadastro | Idioma vivo |
| shadcn/ui + Radix (vendorizado) | vivo | `switch`, `table`, `dialog`, `alert-dialog`, `input` | **Nenhum `npx shadcn add`** — ver UI-SPEC §Gate do shadcn |
| Supabase Postgres + RLS | vivo | `autorizacoes`, matriz nova, trigger de guard | — |
| Supabase Edge Functions (Deno) | vivo | `cadastrar-candidato` (hash), `notificar-candidato` (classe de evento) | — |
| `crypto.subtle` (Deno/Web) | runtime | SHA-256 do texto de consentimento | Zero dependência `[ASSUMED]` |

### Supporting (do próprio repo — reuso, não build)

| Item | Onde | Uso nesta fase |
|------|------|----------------|
| `public.log_auditoria(...)` | `docs/sql/sql/25-functions-configuracoes.sql:63-77`; assinatura verbatim em `20260713000003:38-42` | Trilha de auditoria da edição da janela |
| `public.tocar_atualizado_em()` | `20260722000002:144` | Trigger `BEFORE UPDATE` da tabela de config |
| `config_sla_revisao` | `20260730000001:443-511` | **Molde** da tabela de config |
| `AsyncState` | `src/components/ui/AsyncState.tsx` | Loading/error/empty da matriz |
| `BiasAuditPage` | `src/features/admin/bias-audit/` | Molde estrutural de `/admin/retencao` |
| `explicacaoService` | `src/features/explicacao/services/explicacaoService.ts` | Molde do serviço own-row por allowlist |
| `scripts/check-resend-dominio.mjs` | `:166-182` | Verificação do CONSENT-06 |
| `lazyNamed` | `src/router/lazyNamed.ts` | PERF-03 para `/admin/retencao` |

### Alternativas consideradas

| Em vez de | Poderia usar | Tradeoff |
|-----------|--------------|----------|
| JSON compartilhado em `_shared/` | Constantes espelhadas (idioma `POLICY_VERSION`) | Espelho sem teste já existe há 4 meses sem verificação; com hash, divergir é catastrófico. Se o import cross-boundary for rejeitado, espelhar **com** sonda Vitest (`strict-schema.test.ts`) |
| Trigger no ledger | `if` na EF | EF é contornável pelo próximo emissor; o repo já teve 3+ emissores simultâneos (P39) |
| RPC de escrita | Policy `UPDATE` para `administrador` | Policy não dá trilha de auditoria atômica nem guard server-side sobre o teto |
| Predicado computado | Coluna `retain_until` materializada | §Q4 — o materializado exige deploy para mudar a política e um `UPDATE` em massa para descongelar |

**Instalação:** nenhuma. `npm install` não é executado nesta fase.

---

## Package Legitimacy Audit

**Não aplicável — esta fase instala ZERO pacotes externos.**

Verificado: a UI-SPEC §Registry Safety declara "Zero dependência npm nova"; todos os primitivos
shadcn em escopo estão vendorizados em `src/components/ui/` desde o M1; nenhum `npx shadcn
init`/`add` é executado (o `components.json` está deliberadamente ausente); nenhuma extensão
Postgres nova (`STATE.md:109`). `[VERIFIED: UI-SPEC + STATE + ausência de components.json]`

**Packages removed due to [SLOP] verdict:** none — nenhum pacote foi recomendado.
**Packages flagged as suspicious [SUS]:** none.

Se o plano introduzir qualquer dependência, isso é **desvio de escopo** e exige checkpoint do
operador antes do install, mais o gate de legitimidade completo.

---

## Architecture Patterns

### Diagrama do sistema — o que esta fase acrescenta

```
CANDIDATO (mobile-first)
  │
  ├─ /cadastro  ── AutorizacoesStep ──┐
  │                (4 blocos, opcionais DESMARCADOS)
  │                                   │  POST invoke
  │                                   ▼
  │                          EF cadastrar-candidato
  │                            ├─ Zod .strict() (defaults corrigidos)
  │                            ├─ SHA-256(consent-text.json + versão)   ◄── ÚNICA FONTE DO TEXTO
  │                            └─ INSERT autorizacoes                        (importado também
  │                                 (+consent_text_version/hash/em)            pelo AutorizacoesStep)
  │
  └─ /candidato/privacidade ── AutorizacoesLista
        ├─ linha transacional  (sem controle — Art. 7º V)
        ├─ switch marketing ──► UPDATE own-row (RLS) ou RPC own-row  ──┐
        └─ GuardaCurriculoBloco (lê autorizacao_retencao_curriculo)    │
                                                                       ▼
                                                     public.autorizacoes
                                                       .autorizacao_marketing_vagas
                                                                       │
CAMINHO DE ENVIO                                                       │ lida por
  triggers de funil ─► net.http_post ─► EF notificar-candidato         ▼
                                          └─ INSERT notificacoes ─► trg guard marketing
                                                                    (RAISE se classe=marketing
                                                                     e consentimento ausente)
                                          └─ fetch api.resend.com  ── tracking: OFF no DOMÍNIO
ADMIN (desktop-first)
  └─ /admin/retencao
        ├─ MatrizRetencaoTable ──► SELECT config_retencao (RLS admin)
        ├─ EditarJanelaDialog  ──► RPC salvar_janela_retencao
        │                            └─ UPDATE + log_auditoria (MESMA transação)
        └─ PreviaRetencaoBloco ──► RPC previa_retencao()  ─┐
                                                           ▼
                                     public.candidaturas_alem_da_janela()
                                       (predicado ÚNICO · REVOKE de todo papel cliente)
                                                           │
                                              (Phase 46)   └─► DELETE … consome a MESMA função
```

### Estrutura de arquivos recomendada

```
src/features/privacidade/            # net-new (candidato)
├── components/  PrivacidadeCandidatoPage · AutorizacoesLista
│                ConsentimentoSwitchRow · GuardaCurriculoBloco
├── hooks/       usePrivacidade · useRevogarMarketing
├── services/    privacidadeService.ts (allowlist + PrivacidadeError)
└── __tests__/

src/features/admin/retencao/         # net-new (admin)
├── components/  RetencaoPage · MatrizRetencaoTable
│                EditarJanelaDialog · PreviaRetencaoBloco
├── hooks/       useMatrizRetencao · useSalvarJanela · usePreviaRetencao
├── services/    retencaoService.ts
├── schemas/     janelaRetencaoSchema.ts  (int .min(1).max(24), msgs pt-BR)
└── __tests__/

supabase/functions/_shared/
└── consent-text.json                # ÚNICA fonte do texto de consentimento
└── consent-text.v1-historico.json   # transcrição verbatim do texto pré-fase (não-editável)

supabase/migrations/2026080X0000NN_p43_*.sql
supabase/tests/p43_*_smoke.sql        # gate-GUC, zero escrita persistida
```

### Pattern 1 — Config alterável sem deploy, com escrita auditada

```sql
-- Molde: config_sla_revisao (20260730000001:443-511) + gerir_usuario_rh_mutacao (20260713000003)
CREATE TABLE public.config_retencao_etapa (
  etapa         public.etapa_processo NOT NULL PRIMARY KEY,
  janela_meses  integer NOT NULL CHECK (janela_meses BETWEEN 1 AND 24),  -- teto = copy consentida
  origem        text    NOT NULL DEFAULT 'seed',
  alterado_por  uuid    NULL REFERENCES public.usuarios_rh(id),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.config_retencao_etapa ENABLE ROW LEVEL SECURITY;
-- UMA policy de SELECT, admin-only. NENHUMA policy de escrita (default-deny).
-- A escrita passa exclusivamente pela RPC DEFINER, que audita.
CREATE TRIGGER trg_config_retencao_atualizado_em
  BEFORE UPDATE ON public.config_retencao_etapa
  FOR EACH ROW EXECUTE FUNCTION public.tocar_atualizado_em();   -- reusar, NUNCA redefinir
```

Seed: `INSERT … VALUES (…, 24, 'seed') ON CONFLICT (etapa) DO NOTHING;` — **jamais upsert**;
re-seedar sobrescreveria em produção um número que o operador ajustou (decisão travada desde a P37,
`20260721000002:96-98`).

### Pattern 2 — Mutação + auditoria na MESMA transação

```sql
-- Verbatim do idioma vivo: 20260713000003_usr_rh_mutacao_rpc.sql:119-132
PERFORM public.log_auditoria(
  p_usuario_id   := p_actor,
  p_usuario_tipo := 'admin',
  p_acao         := 'alterar_janela_retencao',
  p_categoria    := 'sistema',      -- conferir o enum categoria_log_auditoria vivo
  p_descricao    := format('Janela de %s: %s -> %s meses', p_etapa, v_antes, p_meses),
  p_severidade   := 'aviso',
  p_recurso_tipo := 'config_retencao_etapa',
  p_recurso_id   := NULL,
  p_dados_antes  := antes,
  p_dados_depois := depois,
  p_sucesso      := true
);
```

### Anti-patterns a evitar

- **`ADD COLUMN … NOT NULL DEFAULT '<versão>'`** para versão/hash de consentimento → back-fill
  silencioso, destrói o SC#1. É o erro que `policy_version` já cometeu (`20260421000001:190`).
- **`ADD COLUMN IF NOT EXISTS`** para coluna nova → mascara divergência; falhar alto é o idioma
  do repo (`20260721000001:35-37`).
- **`select('*')`** em qualquer leitura → RLS é row-level, não column-level
  (`[[reference_select_star_leaks_pii]]`). Toda leitura por allowlist nomeada.
- **`if (!consent) return` só na EF** como enforcement → contornável pelo próximo emissor.
- **UI otimista em escrita de consentimento** → UI-SPEC Invariante 5.
- **`BEGIN;/COMMIT;` no topo da migration** → gatilho do 42601 (CLAUDE.md §Migrations, D-22).
- **Redefinir `tocar_atualizado_em()`** → cria divergência com a versão viva sem ganho
  (`20260730000001:498-500`).

---

## Don't Hand-Roll

| Problema | Não construir | Usar | Por quê |
|----------|---------------|------|---------|
| Trilha de auditoria da edição da janela | Tabela de histórico nova | `public.log_auditoria(...)` | Já é DEFINER com owner BYPASSRLS, sobrevive ao REVOKE da P28, purge-exempt para `usuario`/`seguranca` (`20260713000004:75-79`) |
| Carimbo de `atualizado_em` | Trigger novo | `public.tocar_atualizado_em()` (`20260722000002:144`) | Já existe, search_path vazio, sem privilégio |
| Loading/error/empty da matriz | Estados à mão | `AsyncState` com `copy={{…}}` | Precedência travada `isLoading → slow → isError → isEmpty → children` |
| Verificação de tracking do Resend | `curl` improvisado | `npm run check:resend-dominio` | Já reporta os dois flags, nunca imprime a credencial, no-op sem chave |
| Idempotência/dedupe de e-mail | Nada novo | `uq_notif_dedupe` + `Idempotency-Key` | Duas camadas já provadas ao vivo (`STATE.md:199`) |
| Predicado de purga duplicado | Query na prévia + query no cron | Função SQL única + wrapper agregado | Precedente 04-invent05 + md5 gate do 42-12 |
| Config de retenção de logs | Nova tabela | `configuracoes_empresa.dias_retencao_logs` já existe (730d) | Só citar; não confundir com a matriz de candidato |

**Key insight:** quase tudo que esta fase precisa de infraestrutura já existe neste repositório e
foi construído nas fases 28, 37 e 42. O trabalho genuinamente novo é **três coisas**: as colunas de
prova de consentimento, o guard de marketing no ledger, e a matriz + predicado de retenção. Todo o
resto é composição.

---

## Common Pitfalls

### Pitfall 1 — Corrigir o default só no cliente
**O que dá errado:** checkbox nasce desmarcado, banco grava `true`.
**Por quê:** `_shared/schemas.ts:102-104` (`.optional().default(true)`) e
`cadastrar-candidato/index.ts:293-297` (`?? true`) preenchem no servidor.
**Como evitar:** os 4 sítios de default no mesmo commit; teste de integração provando que um corpo
com `autorizacao_marketing_vagas: false` chega ao insert como `false`.
**Sinal precoce:** o `grep` dos 9 sítios da tabela §Q2 devolve algum sítio não tocado.

### Pitfall 2 — `NOT NULL DEFAULT` na coluna de versão/hash
**O que dá errado:** toda linha histórica passa a afirmar que leu o texto v2.
**Por quê:** o Postgres preenche linhas existentes com o default. Já aconteceu com `policy_version`.
**Como evitar:** `NULL`, sem default. Asserção: `SELECT count(*) FROM autorizacoes WHERE
consent_text_version IS NULL` > 0 logo após o apply, e igual à contagem pré-apply.
**Sinal precoce:** a contagem de NULLs é zero depois da migration.

### Pitfall 3 — `apply_migration` retransmite a migration como STRING
**O que dá errado:** o SQL aplicado em PROD diverge do arquivo, sem erro e sem warning.
**Por quê:** medido três vezes na Phase 42 — duas migrations do M8 perderam blocos de comentário no
apply (`processo-origem-do-drift-desconhecida.md:66-78`).
**Como evitar:** o gate é uma query. Após **cada** apply:
```sql
SELECT md5(statements[1]) FROM supabase_migrations.schema_migrations WHERE version = '<v>';
-- comparar com: printf '%s' "$(cat supabase/migrations/<v>_*.sql)" | md5
```
**E o reparo do ledger não é opcional:** `apply_migration` grava `version` = timestamp do apply, não
o prefixo do arquivo. Sem `UPDATE … SET version='<prefixo>'`, o `db push` leria a migration como
não-aplicada. `[VERIFIED: todo, 3 medições]`

### Pitfall 4 — `db push` (proibido) e o 42601
**O que dá errado:** `ERROR: cannot insert multiple commands into a prepared statement (42601)`.
**Por quê:** corpos PL/pgSQL `$$` adjacentes a `COMMENT`/`GRANT`/`REVOKE` no transaction pooler.
**Como evitar:** `supabase db push` é **proibido neste projeto**. Caminho exclusivo: MCP
`apply_migration` pelo orquestrador. Sem wrapper `BEGIN;/COMMIT;` no topo.
`[VERIFIED: CLAUDE.md + STATE.md:201]`

### Pitfall 5 — Subagentes GSD não têm os tools MCP do Supabase
**O que dá errado:** um plano que atribua migration/inspeção a um executor bate em checkpoint e a
wave para.
**Por quê:** bug upstream anthropics/claude-code#13898 (`STATE.md:206`).
**Como evitar:** **premissa de desenho de wave**, não descoberta de meio de fase. Toda tarefa de
banco/EF é checkpoint do orquestrador. Ver §Wave Shape abaixo.

### Pitfall 6 — Mexer em `email-templates.ts`
**O que dá errado:** reabrir o arquivo que embarcou 2 CRITICAL em PROD (P39 CR-01/CR-02), incluindo
um defeito (`PREHEADERS` não ramificado) invisível a asserções que olham só o texto visível.
**Como evitar:** a UI-SPEC exclui os e-mails do escopo do BD-3 — `email-templates.ts:205/225/270`
ficam **byte-idênticos**. Se um rodapé de marketing for necessário, ele é bloco novo, e só depois
de `/candidato/privacidade` estar viva.

### Pitfall 7 — Contar candidaturas e chamar de candidatos
**O que dá errado:** a prévia infla o número e um candidato com candidatura ativa aparece como
"seria purgado".
**Como evitar:** §Q8, decisão 2. Rótulo e agregação têm de concordar.

### Pitfall 8 — Grep-ban de copy com escopo errado
**O que dá errado:** o teste reprova a copy que a própria UI-SPEC manda escrever (a página
`/admin/retencao` usa "automaticamente" duas vezes, por exigência).
**Como evitar:** dois escopos distintos — `pessoa natural` em `src/` inteiro (→ 0);
`automaticamente`/`será excluído`/`serão apagados`/`exclusão automática` **apenas** na allowlist
`src/features/{cadastro,privacidade,explicacao}/` + `_shared/email-templates.ts`.
`[VERIFIED: UI-SPEC:316-334]`

### Pitfall 9 — Hook pre-commit permanentemente vermelho
**O que dá errado:** commit com `--no-verify` reflexivo.
**Estado real:** o hook virou gate de **não-regressão** na P42 (baseline congelada **97** local,
teto do CI 104) — `.husky/pre-commit:1-30`. Ele passa se a contagem não subir.
**Como evitar:** medir antes/depois com `npm run -s lint 2>&1 | grep -c "error TS"`; **zero
`--no-verify`**. ⚠ RED commit separado para superfície de API nova é **impossível** neste repo
(referenciar símbolo inexistente eleva a contagem acima da baseline) — a lição do 42-11
(`STATE.md:175`) vale integralmente aqui, que também cria API nova.

### Pitfall 10 — `REVOKE … FROM PUBLIC` sem `FROM anon`
**O que dá errado:** função DEFINER continua executável por `anon`.
**Por quê:** defeito real medido na 42-06; rastreado em
`.planning/todos/pending/42-anon-execute-definer-sistemico.md`.
**Como evitar:** toda função nova desta fase: `REVOKE ALL ON FUNCTION … FROM PUBLIC, anon,
authenticated;` e só então o `GRANT` mínimo. Asserção no smoke sobre `pg_proc.proacl`.

---

## Runtime State Inventory

Esta fase **não** é rename/refactor/migração de string, mas mexe em estado vivo de PROD e em
provedor externo — as categorias aplicáveis foram verificadas mesmo assim.

| Categoria | O que foi encontrado | Ação requerida |
|-----------|----------------------|----------------|
| Dados armazenados | `public.autorizacoes` — N linhas vivas com `autorizacao_comunicacao` populado (contagem só medível em PROD). Ganham 3–4 colunas NULL | **Edição de código + migration aditiva. NENHUMA migração de dado.** O NULL é o valor correto para linhas históricas (§Q1, §Q2) |
| Config de serviço vivo | **Resend:** `open_tracking`/`click_tracking` do domínio `rh.beautysmile.com.br` vivem no dashboard do provedor, fora do git | Verificar por `npm run check:resend-dominio`; desligar no dashboard se `true` — checkpoint humano (§Q7) |
| Estado registrado no SO | **Nenhum.** Nenhum cron, task ou daemon desta fase. Os crons vivos (`ai-logs-retention-cleanup`, `notif-retry-sweep`) **não são tocados** — verificado contra `docs/compliance/cron-inventory.md` | Nenhuma |
| Segredos / env vars | **Nenhum novo.** `RESEND_API_KEY` (Vault), `edge_invoke_key`, `project_url` já existem e não mudam de nome. `NOTIFICACOES_MODO` é secret de PROJETO e está em `'producao'` | ⚠ Nenhuma mudança — **mas ver o aviso abaixo** |
| Artefatos de build | `database.types.ts` fica **stale** no instante em que as colunas novas são aplicadas | `npm run db:types` **após** o apply. ⚠ o script usa `>` que TRUNCA antes de executar — provar contra arquivo temporário primeiro (lição da 37-05, `STATE.md:141-142`) |

⚠ **`NOTIFICACOES_MODO='producao'` é o risco operacional #1 desta fase.** Qualquer smoke que
exercite o caminho de envio manda e-mail **real** a candidato real. O guard de marketing do §Q3 é
seguro porque **recusa antes do envio**, mas o smoke tem de ser desenhado para nunca alcançar o
`fetch` do Resend — `RAISE` no `BEFORE INSERT` acontece no claim, que é anterior. Confirmar a
ordem no plano, não presumir. `[VERIFIED: STATE.md:223 + notificar-candidato/index.ts:270-390]`

---

## Environment Availability

| Dependência | Requerida por | Disponível | Versão | Fallback |
|-------------|---------------|------------|--------|----------|
| Supabase MCP (`apply_migration`/`execute_sql`) | toda migration e inspeção | ✓ (só orquestrador) | write restabelecido 2026-07-28 | nenhum — `db push` proibido |
| Supabase CLI | — | ✗ (não instalado, projeto não linkado) | — | MCP pelo main thread |
| `npm run db:types` | regen de tipos pós-apply | ⚠ | usa `npx supabase gen types --linked` | resolvido por `supabase link` na 37-05; pode precisar repetir |
| Chave Resend | verificação do CONSENT-06 | ⚠ humana | no Vault (PROD) e não no ambiente local | operador roda o reporter com a chave, ou confere no dashboard |
| Node/Vitest | testes de `src/` | ✓ | `npm run test:run` | — |
| Deno | testes das EFs | ✓ | `deno test` (corpus 309/309 no 42-08) | — |
| Playwright | E2E | ✓ | `npm run test:e2e` | — |
| Parecer jurídico trabalhista | números finos por estado | ✗ | — | **BD-1: não é bloqueio desta fase** — seed no teto; é pré-requisito da Phase 46 |

**Missing sem fallback:** nenhum bloqueia a Phase 43.
**Missing com fallback:** verificação do Resend (dashboard humano); regen de tipos (link do CLI).

---

## Validation Architecture

### Test Framework

| Propriedade | Valor |
|-------------|-------|
| Framework (client) | Vitest (happy-dom) + Testing Library |
| Framework (EF) | `deno test` — excluído do Vitest por path literal em `vite.config.ts` |
| Framework (banco) | Smoke SQL gate-GUC em `supabase/tests/*.sql`, executado por `execute_sql` numa **única chamada** |
| E2E | Playwright |
| Config | `vite.config.ts` (`test:` block); `supabase/functions/deno.json` |
| Quick run | `npm run test:run` |
| Type gate | `npm run -s lint 2>&1 \| grep -c "error TS"` — baseline congelada **97** |
| Suite completa | `npm run test:run && npm run lint && deno test` (+ smoke SQL por checkpoint) |

### Requirements → Test Map

| Req | Comportamento | Tipo | Comando | Existe? |
|-----|---------------|------|---------|---------|
| CONSENT-01 | Opcionais nascem desmarcados nos 4 sítios de default | unit | `npx vitest run src/features/cadastro` | ❌ Wave 0 |
| CONSENT-01 | Servidor não repõe `true` quando o corpo manda `false` | deno | `deno test supabase/functions/cadastrar-candidato` | ❌ Wave 0 |
| CONSENT-02 | Hash é determinístico e derivado do JSON canônico | deno | `deno test supabase/functions/_shared` | ❌ Wave 0 |
| CONSENT-02 | Linhas pré-enforcement ficam NULL após o apply | smoke SQL | `p43_consent_versao_smoke.sql` | ❌ Wave 0 |
| CONSENT-02 | Os dois JSONs (se espelhados) são byte-idênticos | unit (sonda fs) | `npx vitest run` | ❌ Wave 0 — molde: `strict-schema.test.ts` |
| CONSENT-03 | Coluna nova aditiva, antiga intacta, `COMMENT` presente | smoke SQL | `p43_split_comunicacao_smoke.sql` | ❌ Wave 0 |
| CONSENT-04 | Switch nunca mostra estado não confirmado (sem UI otimista) | unit | `npx vitest run src/features/privacidade` | ❌ Wave 0 |
| CONSENT-04/SC#2 | **INSERT de evento marketing sem consentimento é RECUSADO** | smoke SQL (tx + ROLLBACK) | `p43_guard_marketing_smoke.sql` | ❌ Wave 0 |
| CONSENT-05 | `analise_video` ausente dos 9 sítios; coluna viva com `COMMENT` | unit + smoke | grep-assert + SQL | ❌ Wave 0 |
| CONSENT-06 | `click_tracking=false` no provedor | checkpoint humano | `RESEND_API_KEY=… npm run check:resend-dominio` | ✅ ferramenta existe |
| RETEN-01/02 | Matriz existe, RLS admin-only, seed 24 meses, sem policy de escrita | smoke SQL | `p43_matriz_retencao_smoke.sql` | ❌ Wave 0 |
| RETEN-02 | RPC recusa >24 meses e recusa papel não-admin (42501) | smoke SQL | idem | ❌ Wave 0 |
| RETEN-02 | Edição escreve **uma** linha em `logs_auditoria` na mesma tx | smoke SQL | idem | ❌ Wave 0 |
| RETEN-03 | Três casos do bloco de currículo renderizam corretos | unit | `npx vitest run src/features/privacidade` | ❌ Wave 0 |
| RETEN-04 | Prévia não expõe id/nome/e-mail; função de baixo nível REVOKEd | smoke SQL + unit | `p43_previa_smoke.sql` | ❌ Wave 0 |
| RETEN-04 | Bloco da prévia não contém `<button>`/`<a>` nem verbo destrutivo | unit (asserção negativa) | `npx vitest run` | ❌ Wave 0 — backstop da UI-SPEC E8 |
| RETEN-06 | Veredito registrado **antes** da estrutura nova | artefato | esta seção §Q4 + `43-*-SUMMARY.md` | ✅ este documento |
| BD-3 | `grep -rn "pessoa natural" src/` → 0 | unit (literal montado em runtime) | `npx vitest run` | ❌ Wave 0 |
| BD-3 | Os 3 sítios não pinados (`dialogTitle`, `dialogConfirm`, RH) ganham pin | unit | idem | ❌ Wave 0 |

### Sampling rate

- **Por commit de tarefa:** `npm run test:run` + contagem `tsc` contra a baseline 97
- **Por merge de wave:** `npm run test:run && npm run lint`; `deno test` quando a wave tocar EF
- **Por checkpoint de PROD:** smoke SQL numa **única chamada** `execute_sql` (`set_config(..., false)`
  é escopado à sessão — statements espalhados zeram o contador, lição do 41-05, `STATE.md:160`)
- **Portão da fase:** suíte verde antes de `/gsd-verify-work`

### Wave 0 gaps

- [ ] `src/features/privacidade/**/__tests__/` — CONSENT-04, RETEN-03
- [ ] `src/features/admin/retencao/**/__tests__/` — RETEN-01/02/04
- [ ] Teste de paridade dos JSONs de consentimento (ou do import único) — CONSENT-02
- [ ] `supabase/functions/_shared/__tests__/consent-hash.test.ts` (Deno) — CONSENT-02
- [ ] `supabase/tests/p43_*_smoke.sql` (5 arquivos gate-GUC) — CONSENT-02/03, guard, matriz, prévia
- [ ] Teste de estado visual a 320px do `AutorizacoesStep` — backstop E1 da UI-SPEC
- [ ] Asserção negativa do `PreviaRetencaoBloco` — backstop E8 da UI-SPEC

⚠ **Ordem RED→GREEN:** para símbolo/prop que ainda não existe, o RED **não é commitável** (eleva a
contagem `tsc` acima de 97 e o hook reprova). Commitar o RED onde ele tipa (asserções de valor) e
verificar empiricamente onde não tipa — sem contorcer com `as unknown as` (`STATE.md:175`).

---

## Security Domain

`security_enforcement` não está desabilitado em `.planning/config.json` → seção obrigatória.
O ROADMAP classifica a fase como **baixo risco** ("nenhuma escrita destrutiva, nenhuma EF
privilegiada nova; a superfície de revogação lê/escreve own-row"). A pesquisa **concorda**, com
três ressalvas nomeadas abaixo.

### Categorias ASVS aplicáveis

| Categoria | Aplica | Controle padrão neste repo |
|-----------|--------|-----------------------------|
| V2 Autenticação | não | Nenhuma superfície nova de auth; `RoleGuard` + JWT existentes |
| V3 Sessão | não | Sem mudança |
| V4 Controle de acesso | **sim** | RLS own-row (`autorizacoes`) + RLS admin-only (matriz) + guard de papel **dentro** da RPC (42501), nunca só na tela. `REVOKE … FROM PUBLIC, anon, authenticated` antes de qualquer `GRANT` |
| V5 Validação de entrada | **sim** | Zod `.strict()` nas duas runtimes; `janelaRetencaoSchema` inteiro `.min(1).max(24)`; `CHECK` no banco espelhando o cap |
| V6 Criptografia | **sim** | SHA-256 via `crypto.subtle` para o hash de consentimento — **nunca** hash caseiro, nunca md5 para prova |
| V7 Tratamento de erro / log | **sim** | Allowlist de log **por Edge Function**, nunca importada da vizinha ([Phase 42 / 42-07]). Nenhum e-mail, nome ou hash em `console.*` |
| V8 Proteção de dados | **sim** | Allowlist de colunas em toda leitura; prévia agregada sem id; `pii-inventory.yaml` classifica `ip_aceite` como anonimizar-não-apagar |
| V13 API | **sim** | RPC com parâmetros nomeados e assinatura pinada (idioma do 28-06) |

### Padrões de ameaça para este stack

| Padrão | STRIDE | Mitigação |
|--------|--------|-----------|
| Hash de consentimento forjado pelo cliente | Tampering / Repudiation | Hash calculado **e** gravado exclusivamente no servidor; nunca aceito do corpo |
| Enumeração de PII pela prévia de purga | Information disclosure | Função de baixo nível `REVOKE`d de todo papel cliente; wrapper devolve só contagem |
| Escalada por `EXECUTE` residual em função DEFINER | Elevation of privilege | `REVOKE … FROM PUBLIC, anon, authenticated` explícito + asserção sobre `proacl` (defeito real medido na 42-06) |
| Revogação de consentimento por outro titular | Tampering | Own-row: RLS `candidatos.user_id = auth.uid()` (idioma vivo `candidato_le_propria_decisao`) ou RPC own-row guardada |
| Envio de marketing sem consentimento | Repudiation / compliance | Guard **no banco**, no `BEFORE INSERT` do ledger — não contornável por caminho de envio novo |
| Vazamento de coluna por `select('*')` | Information disclosure | Allowlist nomeada; RLS não filtra coluna |
| Drift silencioso repo↔PROD no apply | Tampering | `md5(statements[1])` vs md5 do arquivo, após **cada** apply |
| Credencial Resend em log/erro | Information disclosure | Postura do `check-resend-dominio.mjs` preservada: chave nunca interpolada em `console.*` |

### Ressalvas ao "baixo risco"

1. **A migration toca a tabela cuja natureza é prova jurídica.** Um erro de `DEFAULT` aqui não
   quebra o sistema — corrompe evidência, silenciosamente e para sempre. Merece asserção
   antes/depois de contagem de NULLs, não só revisão de leitura.
2. **A RPC de escrita da matriz é uma superfície privilegiada nova**, ainda que não seja EF. O
   ROADMAP diz "nenhuma EF privilegiada nova" — verdade, mas `SECURITY DEFINER` é privilégio.
   Aplicar o mesmo rigor de REVOKE/GRANT/guard da P42.
3. **`/candidato/privacidade` é superfície de leitura de consentimento own-row** — o vetor
   `select('*')` é real e o `pii-inventory.yaml:139-151` mostra que `autorizacoes` carrega
   `ip_aceite` e `user_agent_aceite`, que **não** devem chegar à tela do candidato.

---

## Project Constraints (from CLAUDE.md)

Diretivas acionáveis extraídas, com o mesmo peso das decisões travadas:

- **NUNCA** `supabaseAdmin` / service_role no client-side. Operação privilegiada → Edge Function
  ou RPC `SECURITY DEFINER`.
- **RLS habilitada em 100%** das tabelas com dado de usuário → a matriz de retenção nasce com
  `ENABLE ROW LEVEL SECURITY` e policy explícita.
- **`database.types.ts` NUNCA editado à mão** — só `npm run db:types` após o apply.
- **Domínio em pt-BR** (tabelas, enums, mensagens), código técnico em en. Enums DB em snake_case
  pt-BR.
- **Componentes** PascalCase.tsx com **export nomeado** (nunca default) — `lazyNamed` depende disso.
- **Features** em `src/features/<dominio>/` com `components/ hooks/ services/ schemas/ types/`.
- **Services** `camelCaseService.ts` com classe de erro customizada.
- **Query keys hierárquicas** (`retencaoKeys.*`, `privacidadeKeys.*`).
- **Linguagem de produto:** "avaliação comportamental/cognitiva", **nunca** "teste psicológico".
- **RNF-07a:** o sistema NUNCA rejeita candidato automaticamente por score. Nada nesta fase
  introduz automatismo sobre candidatura.
- **Migrations:** o workaround do 42601 está documentado no CLAUDE.md; neste projeto ele é
  substituído por regra mais forte — **`db push` é proibido**, apply exclusivamente por MCP pelo
  orquestrador, com reparo de ledger obrigatório.
- **DevNavigationMenu** gateado por `import.meta.env.DEV`.

---

## Wave Shape — consequência de planejamento, não observação

Porque subagentes GSD não recebem os tools MCP do Supabase (`STATE.md:206`), a fase se organiza
naturalmente em faixas:

| Faixa | Natureza | Quem executa | Paralelizável |
|-------|----------|--------------|---------------|
| A — Copy + defaults + BD-3 | só `src/` | executor | ✓ com C |
| B — Arquivos de migration + smokes SQL (**escrever**, não aplicar) | `supabase/` | executor | ✓ |
| C — Telas novas contra tipos ainda não regenerados | `src/` | executor | ⚠ depende de B tipar |
| D — **apply + reparo de ledger + md5 + smoke + `db:types`** | PROD | **orquestrador (checkpoint)** | ✗ serial |
| E — Deploy da EF `cadastrar-candidato` (hash) | PROD | **orquestrador (checkpoint)** | ✗ após D |
| F — Verificação do Resend | provedor | **humano (Fernando)** | ✓ independente |

⚠ **A ordem D→E importa.** Se a EF que grava `consent_text_hash` for deployada antes de as colunas
existirem, todo cadastro nesse intervalo grava consentimento **sem prova** — e essas linhas ficam
indistinguíveis das históricas, destruindo o SC#1 para uma janela inteira. Colunas primeiro,
sempre.

---

## Assumptions Log

| # | Afirmação | Seção | Risco se errada |
|---|-----------|-------|-----------------|
| A1 | As 3 policies de `autorizacoes` de `docs/RLS_POLICIES.md` (2025-11-13) estão vivas, incluindo o UPDATE own-row do candidato | §Q6 | **Alto** — sem ela, CONSENT-04 precisa de RPC nova e o plano muda de forma. **Medir em `pg_policies` antes de planejar a escrita** |
| A2 | `crypto.subtle.digest('SHA-256', …)` está disponível no runtime Deno das EFs deste projeto | §Q1 | Baixo — API padrão, mas não exercitada neste repo. Provar num `deno test` da Wave 0 |
| A3 | Import de JSON de `supabase/functions/_shared/` a partir de `src/` sobrevive ao build do Vite **e** ao bundle do deploy da EF | §Q1 | Médio — se falhar, cai no fallback espelho+sonda Vitest, que é mais trabalho mas não muda a arquitetura |
| A4 | `click_tracking` do domínio `rh.beautysmile.com.br` está `false` (padrão do Resend) | §Q7 | Baixo — o padrão do provedor é OFF, mas o SC#3 exige confirmação positiva, não presunção |
| A5 | `etapa_processo` é a chave certa da matriz (vs `status_candidatura`) | §Q5 | Médio — trocar depois é migration nova. É recomendação com tradeoff exposto, não fato |
| A6 | Adicionar valor de evento de classe marketing ao CHECK do ledger é aceitável (precedente `revisao_solicitada`) | §Q3 | Médio — se rejeitado no plan-check, cai na Opção B e o SC#2 tem de ser renegociado com o operador |
| A7 | O enum `categoria_log_auditoria` tem valor adequado para a edição da matriz (`'sistema'` ou `'configuracao'`) | §Pattern 2 | Baixo — ler o enum vivo antes de escrever a RPC |
| A8 | Nenhuma linha de `autorizacoes` tem `autorizacao_marketing_vagas` ou colunas de consentimento hoje | §Q1/Q2 | Baixo — as colunas não aparecem em `database.types.ts:369-381`, que é gerado do banco |

---

## Open Questions

1. **`autorizacoes` é 1:1 ou append-only por candidato?**
   - Sabemos: `database.types.ts:415` diz `isOneToOne: false` na FK `candidato_id`. Estruturalmente,
     um candidato pode ter N linhas de autorização.
   - Não sabemos: se **na prática** há mais de uma linha por candidato, e se a revogação deve
     **mutar** a linha existente ou **inserir** uma nova (append-only preserva a história do
     consentimento, que é a postura probatória mais forte, mas muda toda a forma da leitura).
   - Recomendação: medir `SELECT candidato_id, count(*) FROM autorizacoes GROUP BY 1 HAVING
     count(*) > 1` em PROD **antes** de projetar a escrita. Se hoje é 1:1, recomendo **mutar +
     carimbar `revogado_em`** (mais simples, e a trilha vai para `logs_auditoria`), reservando o
     append-only para uma decisão do operador.

2. **O `INSERT` best-effort de `autorizacoes` deve ser corrigido nesta fase?**
   - Sabemos: `cadastrar-candidato/index.ts:307-312` engole a falha com `console.warn`.
   - Não sabemos: se existem candidatos sem linha de autorização hoje (medível:
     `SELECT count(*) FROM candidatos c WHERE NOT EXISTS (SELECT 1 FROM autorizacoes a WHERE
     a.candidato_id = c.id)`).
   - Recomendação: medir. Se > 0, é achado de compliance que merece decisão do operador, não
     correção silenciosa. Se = 0, registrar como débito nomeado com a medição datada.

3. **Rótulo da prévia: "candidatos" ou "candidaturas"?**
   - A UI-SPEC diz "{Estado} · {n} candidatos", mas a matriz é keyed por estado de **candidatura**.
   - Recomendação em §Q8, decisão 2. Precisa de escolha explícita, e ela altera a copy aprovada —
     logo é ajuste de UI-SPEC, não liberdade do executor.

4. **A janela do candidato que NÃO autorizou a guarda do currículo.**
   - A copy aprovada diz "ficam com a gente apenas enquanto o processo durar". Isso implica uma
     janela mais curta que a matriz — mas a fase é zero-destrutiva e BD-1 semeia tudo no teto.
   - Recomendação: **não** colocar no predicado agora; registrar como dependência explícita da
     Phase 46, junto com o parecer jurídico. A copy continua verdadeira porque nada apaga hoje.

---

## State of the Art

| Antes | Agora | Quando mudou | Impacto nesta fase |
|-------|-------|--------------|--------------------|
| Consentimento = 4 booleanos + `policy_version` | Consentimento = booleanos + **texto versionado e hasheado** | prática pós-LGPD/GDPR | CONSENT-02 é o requirement, não um extra |
| Opt-out por "unsubscribe" único | Separação transacional × marketing, com base legal distinta por canal | Art. 7º V vs Art. 5º XII | CONSENT-03; o transacional **não** ganha checkbox |
| Tracking de e-mail como padrão | Resend entrega tracking **OFF por padrão** por domínio | política do provedor | CONSENT-06 é verificação, não implementação |
| Retenção hard-coded na aplicação | Retenção como config em banco, editável e auditada | RETEN-01/02 | Verdadeiro para `logs_auditoria` neste repo desde a P28 |

**Deprecado / a evitar:**
- "direito ao esquecimento" — não é o termo da LGPD (Art. 18, VI fala em **eliminação**). Sai da
  copy (UI-SPEC §Rodapé).
- "revisão por pessoa natural" — juridiquês sobre um direito. BD-3.
- "através do nosso portal" em `AutorizacoesStep.tsx:91-93` — o portal não existe. UI-SPEC
  Invariante 1.

---

## Sources

### Primária (HIGH confidence) — repositório medido em 2026-08-01

- `src/features/cadastro/{schemas/candidatoSchema.ts, components/CadastroMultiStepForm.tsx, components/steps/AutorizacoesStep.tsx, services/cadastroService.ts, types/formTypes.ts, constants.ts}`
- `supabase/functions/{_shared/schemas.ts, _shared/constants.ts, cadastrar-candidato/index.ts, notificar-candidato/index.ts, notificar-candidato/helpers.ts}`
- `supabase/migrations/{20260421000001, 20260609000001, 20260609000003, 20260713000003, 20260713000004, 20260721000001, 20260721000002, 20260722000002, 20260726000001, 20260730000001, 20260730000005}`
- `database.types.ts` (gerado do catálogo vivo) — `autorizacoes:368`, `candidaturas:917`,
  `historico_candidatura:2073`, `logs_auditoria:2176`, `preferencias_notificacoes:2690`,
  `etapa_processo:5290`, `status_candidatura:5319`
- `docs/compliance/{pii-inventory.yaml, pii-inventory.md, ddl-idiom-sweep.md, sql/04-invent05-blast-radius.sql}`
- `.planning/{STATE.md, ROADMAP.md, REQUIREMENTS.md, research/FK-AUDIT-LIVE.md, todos/pending/processo-origem-do-drift-desconhecida.md}`
- `scripts/check-resend-dominio.mjs`, `.husky/pre-commit`, `vite.config.ts`, `tsconfig.json`,
  `.planning/config.json`

### Secundária (MEDIUM confidence)

- Context7 `/llmstxt/resend_llms-full_txt` — `PATCH /domains/{id}` com `open_tracking` /
  `click_tracking`; *"Open and click tracking is disabled by default for all domains"*
  (`resend.com/docs/dashboard/domains/{introduction,tracking}`) — corroborado pelo docblock do
  `check-resend-dominio.mjs:25`, escrito na P36 a partir da mesma fonte
- `docs/RLS_POLICIES.md` (2025-11-13) — 3 policies de `autorizacoes`. **Documento, não catálogo.**
  Rebaixado a MEDIUM e listado como A1 no Assumptions Log

### Terciária (LOW confidence)

- Disponibilidade de `crypto.subtle` no runtime Deno das EFs (A2) — conhecimento de treino, não
  exercitado neste repositório
- Sobrevivência do import de JSON cross-boundary ao bundle do deploy (A3)

---

## Metadata

**Confidence breakdown:**
- Stack e ausência de dependências novas: **HIGH** — medido; zero npm novo é invariante do M8
- Arquitetura (config, RPC, trigger de guard, predicado único): **HIGH** — cada peça tem molde vivo
  citado por arquivo:linha (P28, P37, P42)
- Estado dos consentimentos (órfãos, defaults, sítios): **HIGH** — grep repo-wide
- Enforcement de marketing: **HIGH** quanto ao diagnóstico (não existe caminho de marketing, e o
  ledger é candidatura-escopado por construção); **MEDIUM** quanto à forma recomendada — a Opção A
  é uma escolha de desenho dentro da discricionariedade da fase, e depende de A6
- RLS de `autorizacoes`: **MEDIUM/LOW** — só documento de 2025; **exige medição antes do plano**
- Resend / CONSENT-06: **HIGH** para "é setting de domínio, não de código"; **MEDIUM** para o valor
  atual dos flags (não medido)
- Pitfalls de migration/apply/drift: **HIGH** — três medições registradas na Phase 42

**Research date:** 2026-08-01
**Valid until:** 2026-08-31 para o repositório (estável). **7 dias** para o estado vivo de PROD e
para os flags do Resend — os dois mudam fora do git.
