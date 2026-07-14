# Feature Research — M6 "Operação do Funil RH"

**Domain:** ATS funnel-OPERATION (recruiter working the pipeline) — brownfield, sobre um funil de 6 etapas + `historico_candidatura` já gravado
**Researched:** 2026-07-14
**Confidence:** HIGH (KPIs, advance/reject, CV/AI visibility) · MEDIUM (work-queue UX, scheduling-sem-email — este último deliberadamente diverge do padrão de mercado)

> Substitui a pesquisa de features do M1 (portal do candidato, 2026-04-19). Escopo agora = as 5 capacidades OPER do M6.

---

## Enquadramento: o *delta* do M6

O M6 não constrói um ATS do zero — constrói a **esteira** que faz um funil já-avaliativo *andar* pela mão do RH. Cinco capacidades OPER:

1. **Avançar/rejeitar etapa individual** em todo o funil (hoje concentrado na etapa 5/Kanban).
2. **Agendamento de entrevista no sistema** (candidato acompanha pelo painel — **sem e-mail**).
3. **CV + análise da IA visíveis ao RH** (hoje o humano "decide" sem ver o currículo).
4. **Dashboard/lista como fila de trabalho real + KPIs operacionais** sobre `historico_candidatura`.
5. **[tech-debt funil-02]** rejeição a partir do comparativo com justificativa auditável.

**Invariante que atravessa tudo (RNF-07a):** o sistema **nunca** avança/rejeita sozinho por score. Toda ação de funil do M6 é um *write disparado por humano*; a IA só recomenda. O único auto-reject sancionado (knockout determinístico da etapa 1, objetivo, já auditado) **não** é tocado por este milestone.

**Padrão de mercado ancorado nesta pesquisa:** Greenhouse, Lever, Ashby e Workable convergem em quatro primitivas — (a) *candidate profile* como hub único com *activity feed* auditável; (b) mover candidato por *stages* nomeados com transição carimbada (data+usuário); (c) *disposition/rejection reason* estruturada e obrigatória; (d) relatórios de *stage velocity / aging* sobre o log de transições. O código Beauty Smile já tem a fundação de dados dos quatro (`historico_candidatura`, `registrar_decisao`, `etapa_processo`) — o M6 é majoritariamente **superfície + agregação**, não novo backbone.

---

## Capacidade 1 — Avançar/rejeitar etapa individual em todo o funil

> Padrão ATS: mover um candidato por *stages* nomeados é a ação nº 1 do recrutador; cada movimento é carimbado (data+usuário) e alimenta métricas sem entrada manual. Rejeição exige *disposition reason* estruturada (compliance/EEOC). Workable e Ashby permitem também mover para etapa **anterior**.

### Table Stakes

| Feature | Por que é esperado | Complexidade | Notas / dependência no código atual |
|---|---|---|---|
| Ação "Avançar para {próxima etapa}" per-candidatura em **todas** as etapas | Vaga com 1 candidato hoje é beco sem saída; operar exige `UPDATE` via SQL | MEDIUM | Reusa `updateCandidaturaEtapa`/trigger `avancar_etapa`; expor como bloco per-row na TriagemTable + CTA no fim de cada workspace (entrevista habilitada quando `revisao_confirmada_em` existe). B2 do M4-PRODUCT-EVAL. |
| Confirm dialog antes de avançar/rejeitar (dupla-ação) | Movimento de funil é irreversível-na-prática; padrão universal | LOW | AlertDialog já usado no codebase |
| **Rejeição = write auditável com justificativa obrigatória** em qualquer etapa | Só existe na etapa 5 hoje; candidato rejeitado (caso majoritário) ganha CTA de explicação que abre tela vazia | MEDIUM | **Unificar toda rejeição no capture do `registrar_decisao`** (justificativa ≥50 chars, `por_usuario NOT NULL`) com `etapa_origem`. Fecha o loop LGPD Art. 20. B3. |
| Transição escreve linha em `historico_candidatura` (from→to+ts+ator) | É a fonte dos KPIs; sem isso o dashboard mente | LOW | Trigger já grava; garantir que **todo** caminho (avanço, rejeição, retrocesso) passe por ele |
| Motivo de rejeição estruturado (categoria) **além** do texto livre | Disposition reason é requisito de auditoria/anti-viés; texto-livre puro não agrega | LOW/MEDIUM | Enum pt-BR curto (`nao_qualificado`, `outro_candidato_escolhido`, `desistiu`, `reprovado_avaliacao`, `outro`) **+** justificativa textual. Não substituir o texto por dropdown genérico (ver anti-features) |

### Differentiators

| Feature | Proposta de valor | Complexidade | Notas |
|---|---|---|---|
| Mover para etapa **anterior** (retrocesso auditado) | Ashby/Workable oferecem; corrige erro de operação sem apagar trilha | MEDIUM | Escrever transição reversa em `historico` (não `UPDATE` silencioso), justificativa opcional mas registrada — senão corrompe time-in-stage (ver anti-features) |
| Seção "Histórico" no hub renderizando `historico_candidatura` | O *activity feed* é a espinha do candidate-profile em todo ATS; torna a decisão auditável no próprio produto | LOW/MEDIUM | Dado já existe; é só projeção read-only (allowlist — nunca vazar gabarito/score bruto ao render). B4. |
| "Manter no banco de talentos" como flag na rejeição | Recruta os mesmos cargos continuamente | LOW | Só a flag no M6; o banco em si é TALENT (M7+) |

### Anti-Features

| Feature | Por que pedida | Por que problemática | Alternativa |
|---|---|---|---|
| Auto-avanço/auto-reject por threshold de score | "IA já sabe, por que clicar?" | **Viola RNF-07a** (constraint de banco) + risco jurídico LGPD Art. 20 | IA recomenda via `SugestaoIABadge`; humano confirma o write |
| Dropdown de motivo de rejeição **genérico e único** (sem texto) | Rápido de clicar | Recrutadores escolhem o topo da lista por hábito → documentação vaga, indefensável em auditoria | Enum + **justificativa textual obrigatória** (≥50 chars) |
| Retrocesso via `UPDATE candidaturas.etapa_atual` direto | "É só voltar a coluna" | Não gera linha no log → time-in-stage e conversão passam a mentir | Retrocesso **sempre** escreve transição no `historico` |
| Bulk-advance (mover N candidatos de uma vez) | Escala | Cada avanço/rejeição precisa de decisão individual (RNF-07a) + justificativa; bulk incentiva rejeição sem análise | Ação per-row; no máximo, fila que *acelera navegação*, não a decisão |

**Dependências:** o *write auditável unificado* (`registrar_decisao` com `etapa_origem`) é **foundational** — a Capacidade 5 (reject-do-comparativo) e a fila "o que precisa de ação" dependem dele. Reconcilia com M4/P25 (Kanban + reject-audit já existem na etapa 5); o M6 estende o *mesmo* write path às outras 5 etapas.

---

## Capacidade 2 — Agendamento de entrevista no sistema (SEM e-mail)

> Padrão ATS (Greenhouse): agendamento vive na aba "Stages" do candidate-profile; RH escolhe data/hora, atribui entrevistador, e **o sistema dispara convites por e-mail com .ics + interview kit**. **É exatamente aqui que o Beauty Smile diverge do mercado por decisão de escopo:** COMM (e-mail) está fora do M6 — o candidato aprende do agendamento **só pelo painel**.

### Modelo mínimo viável (o que realmente precisa existir)

| Campo | Obrigatório | Notas |
|---|---|---|
| `data_hora` da entrevista | Sim | Reusar `candidaturas.data_entrevista_online` / `data_entrevista_presencial` — **colunas já existem e estão sem uso** (B7, sem migração de schema para o campo-base) |
| `tipo` (online / presencial) | Sim | Mapeia às etapas `entrevista_online` / `entrevista_presencial` |
| `link` (online) **ou** `local` (presencial) | Sim (condicional) | RH **cola** um link Meet/Zoom (não hospedamos vídeo) ou digita endereço. Pode precisar de colunas novas `link_entrevista`/`local_entrevista` |
| `entrevistador` | Opcional | Nome/`usuario_rh` responsável; hoje o material do guia já existe no EntrevistaWorkspace |
| `observacoes` (instruções ao candidato) | Opcional | "traga documento X", "chegue 10 min antes" |

### Table Stakes

| Feature | Por que é esperado | Complexidade | Notas |
|---|---|---|---|
| RH registra data/hora/link(ou local) por candidatura no EntrevistaWorkspace | Hoje a etapa 4 roda inteira no WhatsApp; o CTA "Agendar" já renderiza *disabled* de propósito | MEDIUM | Write RH-scoped (RLS vaga-scoped, padrão M4 P24); grava linha de auditoria em `historico` (ou campo `agendado_por/em`) |
| **Candidato vê a entrevista marcada no painel** (data, hora, link/local) | Sem e-mail, o painel é o **canal único** | MEDIUM | Dar `rotaCandidato` às etapas `entrevista_*` (hoje não têm) + card "Sua entrevista está marcada para {X}" com link clicável |
| Editar/remarcar mantém trilha | Remarcar é rotina | LOW/MEDIUM | Novo valor + marker "atualizado em {ts}"; candidato vê a data nova no painel |
| Estado "entrevista ainda não agendada" honesto | Não prometer o que não há | LOW | Painel diz "aguardando agendamento" em vez de "Sem horário" eterno |

### Differentiators

| Feature | Proposta de valor | Complexidade | Notas |
|---|---|---|---|
| Botão "Adicionar à minha agenda" (.ics gerado client-side) | Substitui o convite .ics do e-mail sem depender de COMM | LOW | Download de `.ics` no navegador do candidato e/ou do RH — zero e-mail, zero backend de calendário |
| Lembrete 24h **no painel** (badge/contagem) | O marker 24h já existe no código, hoje quebrado | LOW | Countdown/badge no card do candidato; nunca e-mail/SMS |
| Registro de comparecimento (`compareceu` sim/não) | Habilita métrica de no-show do PRD | LOW | Campo novo; alimenta KPI (Capacidade 4) |

### Anti-Features (o que o mercado faz por e-mail e nós **não** faremos agora)

| Feature | Por que pedida | Por que problemática aqui | Alternativa |
|---|---|---|---|
| Convite de entrevista **por e-mail** (com .ics + interview kit) | É o default de todo ATS | COMM está fora do escopo M6; construir meio-pipeline de e-mail é dívida pior que ausência | Card no painel + `.ics` para download |
| Self-scheduling estilo Calendly (candidato escolhe slot) | Reduz idas-e-vindas | Exige motor de disponibilidade + notificação — dois sistemas ausentes | RH define o horário; candidato só consulta |
| Two-way calendar sync (Google/Outlook/MS Bookings OAuth) | Evita double-booking | Integração externa frágil; MS Bookings já diferido a "Future" pelo projeto | Link colado manualmente; `.ics` para o RH gerenciar a própria agenda |
| Lembretes automáticos por e-mail/SMS | Reduz no-show | Depende de COMM | Badge/contagem no painel |
| Hospedar a sala de vídeo | "Tudo num lugar" | Fora de domínio; caro | Armazenar **link** que o RH cola |

**O que normalmente é e-mail e precisa virar painel:** (1) o *convite* → card no dashboard + indicador in-app; (2) o *.ics* → botão de download; (3) *remarcação/cancelamento* → painel reflete a data nova + "atualizado em"; (4) *lembrete 24h* → badge no painel; (5) *convite ao entrevistador* → fora de escopo (RH gerencia a própria agenda; opcional `.ics` para o RH).

**Dependência crítica:** o candidato só "aprende" pelo painel se as etapas `entrevista_online/presencial` tiverem `rotaCandidato` mapeada no `funilNavMap` — hoje não têm. Sem isso, o agendamento é invisível ao candidato.

---

## Capacidade 3 — CV + análise da IA visíveis ao RH

> Padrão ATS: o *candidate profile* centraliza CV, respostas, scorecards e feedback; o interview kit inclui o resumo/currículo. Hoje **nenhuma superfície RH abre o CV** (zero `createSignedUrl` fora do fluxo do candidato) e `resumo_cv` não renderiza — o humano "decide" sem auditar o score, minando o próprio RNF-07a.

### Table Stakes

| Feature | Por que é esperado | Complexidade | Notas |
|---|---|---|---|
| Botão "Ver currículo" (signed URL, bucket privado `curriculos`) | O recrutador precisa ler o CV que a IA leu | MEDIUM | `createSignedUrl` RH-scoped; padrão já usado no fluxo candidato. B5. |
| Painel/drawer "Análise da IA" **completo** | Fortes/gaps hoje truncados a 2 itens; `resumo_cv` invisível | MEDIUM | Resumo, **todos** os fortes/gaps, flags, `score_match` com `SugestaoIABadge` ("recomendação, não decisão"). Reusa hooks já importados pelo hub |
| Card de identidade (e-mail, telefone, vaga, data, respostas do formulário) | Hub hoje monta vazio ("Candidato", etapa "—") | LOW/MEDIUM | Projeção allowlist (nunca `select('*')` — [[reference_select_star_leaks_pii]]) |
| Scores das etapas concluídas (SJT, redação, entrevista) apresentados **neutros** | Recrutador precisa do quadro para decidir | LOW | Já gravados em `scores_candidato`; Big Five → **bandas neutras**, nunca percentil bruto (UX-07/M4 P23) |

### Differentiators

| Feature | Proposta de valor | Complexidade | Notas |
|---|---|---|---|
| CV + análise lado-a-lado (split view) | Auditar o score contra o documento em uma tela | MEDIUM | Reusa padrão visual do RedacaoReviewPanel |
| Link para o comparativo já gerado | Evita re-pagar IA; contexto de ranking | LOW | Comparativo já existe; só expor o link (não re-disparar — ver B9) |

### Anti-Features

| Feature | Por que pedida | Por que problemática | Alternativa |
|---|---|---|---|
| Expor percentil bruto/score cru como número dominante | "Mais dado = melhor decisão" | Ancora o humano e psicometricamente indefensável (norma sintética) | Bandas qualitativas neutras + disclaimer |
| Parsing/reescrita automática do CV para "match score" novo | "Já que estamos aqui" | Custo + risco de viés; já existe `score_match` | Mostrar o que **já** foi gerado |
| `select('*')` no candidate profile do RH | "Trazer tudo de uma vez" | Vaza gabarito/PII/motivo_rejeicao entre personas | Allowlist explícita por superfície |

**Dependência:** independente das demais — pode rodar em paralelo. **Cuidado de segurança:** projeção allowlist + EF/RPC *authenticate-THEN-authorize* (padrão M2 P10) para o signed URL; RLS vaga-scoped para não deixar recrutador ver CV de vaga alheia.

---

## Capacidade 4 — Dashboard/lista como fila de trabalho real + KPIs operacionais

> Padrão ATS: existem **dois artefatos distintos** — o *pipeline board* (Kanban, "onde está cada um NESTA vaga") **e** a *work-queue/inbox* ("o que precisa da MINHA ação agora", cross-vaga, ordenado por prioridade/aging). Ashby dispara *alerts* para candidatos parados >5 dias; Greenhouse tem "My Dashboard/tasks". O relatório de *hiring velocity* mostra tempo médio por etapa sobre o log de transições.

### Kanban (já existe) vs Work-Queue (o delta do M6) — precisamos dos DOIS

| | Kanban / board (já construído, M4/P25) | Work-queue / fila (net-new M6) |
|---|---|---|
| Pergunta que responde | "Onde está cada candidato **nesta vaga**?" | "**O que eu preciso fazer agora**, em todas as vagas?" |
| Organização | Espacial, por coluna=etapa, **por vaga** | Lista priorizada, **cross-vaga**, por urgência/aging |
| Sinal principal | Distribuição / posição | Ação pendente + tempo parado (SLA) |
| Veredito | **Manter** — bom para visão de uma vaga | **Construir** — é o "argumento de existência" perante o sponsor |

São jobs diferentes; não substituir um pelo outro. O M6 adiciona a work-queue **sem** remover o Kanban.

### Table Stakes

| Feature | Por que é esperado | Complexidade | Notas |
|---|---|---|---|
| Fila de ações cross-vaga: redações `pendente_humano`, análises IA falhas (reprocessar), transcrições sem revisão, **candidatos parados >N dias por etapa** | O "primeiro badge de SLA do sistema"; hoje os cards contam status M1 morto (zeros eternos) | MEDIUM | B6. Métricas por `etapa_processo` **real**, não pelo modelo M1 |
| Contadores de volume por etapa **real** | Dashboard atual usa coluna inexistente (`ativa`) e status que o M2 nunca grava | LOW/MEDIUM | Snapshot: `current_stage` por candidatura |
| KPIs essenciais: tempo por etapa, conversão etapa→etapa, volume por vaga/etapa | É a resposta ao sponsor: "estamos contratando melhor e mais rápido?" | MEDIUM/LARGE | **RPC de agregação sobre `historico_candidatura`** (definições computáveis abaixo). D1/F1 |
| Badge SLA no dashboard ("N em triagem há >48h") | Sinal de gargalo; o padrão de mercado | LOW/MEDIUM | Threshold por etapa configurável |

### Differentiators

| Feature | Proposta de valor | Complexidade | Notas |
|---|---|---|---|
| Tempo total inscrição→decisão (time-to-hire) + taxa de knockout + drop-off da avaliação | Responde diretamente às métricas de sucesso do PRD | MEDIUM | Tudo derivável do log |
| Filtro/ordenação da fila por aging desc | Recrutador ataca o mais parado primeiro | LOW | Ordenação sobre time-in-stage |
| Source-of-hire (via `como_conheceu` do cadastro) | Atribuição de canal | LOW | Dado auto-reportado, não por-vaga → tratar como *nice-to-have* |

### Anti-Features

| Feature | Por que pedida | Por que problemática | Alternativa |
|---|---|---|---|
| Suíte completa de BI/Recharts (o que a tela "Relatórios" M1 faz hoje) | "Dashboards bonitos" | 1.229 linhas sobre modelo morto = gráficos que **mentem** e corroem confiança | **Remover** o legado; poucos KPIs corretos > muitos falsos |
| Export CSV/PDF de relatórios | "Preciso mandar pro chefe" | Fora de escopo M6 (relatórios completos → backlog) | KPIs on-screen; export depois |
| Média (mean) de tempo por etapa | Fácil | Distribuição é right-skew (1 candidato parado 60d distorce) | **Mediana** (`percentile_cont(0.5)`) |
| Tiles agregados/badges hardcoded (12/5) | Herança M1 | Números fantasma; pior que vazio | Contagens reais ou empty-state honesto |

---

## KPIs — definições concretas e computáveis sobre `historico_candidatura`

**Forma do evento (confirmar nomes exatos em `database.types.ts` na fase de requirements):**
`historico_candidatura(candidatura_id, etapa_origem, etapa_destino, criado_em, por_usuario, tag?, justificativa?)` — uma linha **por transição**, carimbada com timestamp e ator. Etapas: `inscricao → triagem → avaliacao_assincrona → entrevista_online → entrevista_presencial → decisao_final` + terminais `aprovado`/`rejeitado`.

Toda métrica abaixo é derivável **sem novos dados de captura** (exceto no-show, que precisa de `compareceu`).

### K1 — Tempo na etapa atual (per candidatura) — *o sinal da work-queue*
Entrada na etapa corrente = timestamp da transição mais recente **para** a etapa atual:
```
tempo_na_etapa(c) = now() - (
  SELECT max(criado_em) FROM historico_candidatura
  WHERE candidatura_id = c AND etapa_destino = etapa_atual(c)
)
```
(Usar `etapa_destino = etapa_atual` — e não só "última linha" — para não zerar o relógio quando houver retrocesso+reavanço.)

### K2 — Candidatos parados / aging (SLA breach) — *a fila*
```
SELECT candidatura_id, etapa_atual, vaga_id, tempo_na_etapa
FROM (K1 por candidatura ativa)
WHERE etapa_atual NOT IN ('aprovado','rejeitado')
  AND tempo_na_etapa > limite_sla(etapa_atual)
ORDER BY tempo_na_etapa DESC;
```
`limite_sla` = threshold por etapa (config; ex.: triagem 48h, avaliação 5d). Este é o primeiro badge de SLA do sistema e a espinha do work-queue.

### K3 — Tempo mediano por etapa (histórico) — *stage velocity / gargalos*
Duração de cada visita = tempo até a **próxima** transição (window `LEAD`):
```
WITH visitas AS (
  SELECT candidatura_id,
         etapa_destino AS etapa,
         criado_em     AS entrou_em,
         LEAD(criado_em) OVER (PARTITION BY candidatura_id ORDER BY criado_em) AS saiu_em
  FROM historico_candidatura
)
SELECT etapa,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY saiu_em - entrou_em) AS mediana_na_etapa
FROM visitas
WHERE saiu_em IS NOT NULL                     -- só visitas concluídas
  AND etapa NOT IN ('aprovado','rejeitado')
  AND entrou_em >= now() - interval '90 days'  -- janela móvel (cohort)
GROUP BY etapa;
```
Usar **mediana** (não média). Visitas ainda-em-curso (`saiu_em IS NULL`) entram no aging (K2), não na mediana histórica.

### K4 — Conversão etapa→etapa (yield) — *onde o funil vaza*
"Entrou na etapa S" = existe transição com `etapa_destino = S` (distinct por candidatura):
```
conversao(S → prox) = |candidaturas que entraram em prox| / |candidaturas que entraram em S|
```
**Cuidado de cohort (gotcha):** candidato parado em S ainda em análise **não** é drop — é in-flight. Conversão ingênua subestima. Restringir a cohort a candidaturas **maduras** (entraram em S antes de `now() - mediana(S)`, ou que já alcançaram um terminal / etapa posterior). Documentar isso; a fase de requirements deve escolher a base (recomendação: cohort por `inscricao` num intervalo fechado).

### K5 — Volume por vaga/etapa (snapshot) — *as barras do funil + contagem das colunas*
```
current_stage(c) = etapa_destino da última transição de c
SELECT vaga_id, current_stage, count(*) FROM (...) GROUP BY vaga_id, current_stage;
```
(Alternativa: `candidaturas.etapa_atual` denormalizado — mais barato; usar `historico` como fonte de verdade para reconciliar.)

### K6 — Tempo total inscrição→decisão (time-to-hire / time-to-decision)
```
para candidaturas com transição para terminal:
total(c) = criado_em(transição PARA aprovado|rejeitado) - criado_em(primeira linha / inscricao)
KPI = percentile_cont(0.5) sobre a cohort (por vaga / janela)
```
Mapeia ao **time-to-hire** (jornada do candidato: aplicou→decidiu). **Time-to-fill** (requisição→contratação) só é aproximável via `vagas.published_at` (não há evento de aprovação de requisição no log) — rotular como *proxy*.

### K7 — Taxa de knockout (etapa 1)
```
taxa_knockout = |transições tag='knockout' (inscricao→rejeitado)| / |inscrições| na janela
```
Já gravado como linha de auditoria; é o único auto-reject e deve ser reportado **separado** das rejeições humanas.

### K8 — Rejeição/drop por etapa
```
drop(S) = |candidaturas com transição S → rejeitado| / |candidaturas que entraram em S|
```
Usa `etapa_origem = S AND etapa_destino = 'rejeitado'`.

### K9 — Source of hire *(differentiator, dado mais fraco)*
`candidatos.como_conheceu` (auto-reportado no cadastro) → distribuição de aplicações/decisões por canal. **Não** é por-vaga nem verificável; tratar como opcional.

### K10 — No-show *(precisa de novo campo)*
Requer `compareceu` (sim/não) no agendamento (Capacidade 2). Sem isso, **não é computável** hoje — sinalizar como dependência entre C2 e os KPIs.

**Confiança dos KPIs: HIGH.** Definições (yield ratio, stage duration, time-to-hire vs time-to-fill, mediana sobre skew, cohort maturity) são convergentes na literatura de recruiting analytics (AIHR, hrtutorial, guias de SLA) e todas mapeiam 1:1 ao log de transições que o projeto já grava desde a Phase 6.

---

## Capacidade 5 — Reject-do-comparativo com justificativa (tech-debt funil-02)

### Table Stakes

| Feature | Por que é esperado | Complexidade | Notas |
|---|---|---|---|
| Ligar os botões no-op `onRejeitar`/`onAvancar` do ComparativoScreen | Hoje o RH confirma um AlertDialog e **nada acontece** — a pior classe de bug de confiança | LOW (SMALL) | Ligar ao **mesmo** capture do `registrar_decisao` (justificativa ≥50) da Capacidade 1. B9. |
| Rejeição do comparativo escreve `decisao_final` + `historico` com `etapa_origem` | Fecha o loop Art. 20 para o caso majoritário (rejeitado) | LOW | Reusa o write auditável unificado |
| Comparativo como `useQuery` keyed por (vagaId, finalistas) + "Atualizar" | Hoje `useEffect` re-dispara IA paga (~40-100s) a cada troca de aba | LOW | staleTime longo + botão explícito |

### Anti-Feature

| Feature | Por que problemática | Alternativa |
|---|---|---|
| Rejeição em 1 clique no comparativo (sem justificativa) | A trilha "toda rejeição tem justificativa humana" quebra; candidato recebe CTA de explicação que abre tela vazia | Mesmo capture obrigatório de justificativa das outras superfícies |

**Dependência:** puramente sobre o *write auditável unificado* da Capacidade 1 — é a aplicação mais barata dele.

---

## Feature Dependencies

```
[C1: write auditável unificado (registrar_decisao + etapa_origem + historico)]
   ├──requires──> historico_candidatura populado (JÁ existe, Phase 6)
   ├──enables───> [C5: reject-do-comparativo]      (aplicação barata do mesmo write)
   ├──enables───> [C4: work-queue "o que precisa de ação"]  (fila de rejeições/avanços pendentes)
   └──preserves─> RNF-07a (todo write é human-triggered)

[C4: KPIs + work-queue]
   ├──requires──> historico_candidatura (event log)   ── JÁ existe
   ├──requires──> SLA thresholds por etapa (config)    ── net-new, LOW
   └──enhances──> [Kanban existente]  (coexistem; jobs diferentes)

[C2: agendamento]
   ├──requires──> rotaCandidato para entrevista_online/presencial no funilNavMap  (net-new)
   ├──reuses────> candidaturas.data_entrevista_* (colunas ociosas)  ── sem migração base
   └──feeds─────> [K10 no-show]  (só se adicionar campo `compareceu`)

[C3: CV + análise IA ao RH]
   └──independente──> roda em paralelo (só superfície + allowlist + signed URL)
```

### Notas de dependência
- **C1 é o gargalo de ordenação:** C5 e a fila de ações de C4 pendem dele. Fazer C1 cedo.
- **C4-KPIs é independente de C1** para os números históricos (o log já está lá), mas a *fila de ação* ("candidatos aguardando decisão") fica muito mais útil quando C1 existe.
- **C2 depende de dar rota ao candidato** nas etapas de entrevista — sem isso, agendamento é invisível ao candidato (quebra o "sem e-mail = painel é canal único").
- **C3 é paralelizável** — nada bloqueia; maior ganho de confiança por menor custo.

---

## MVP Definition

### Launch With (M6 v1)
- [ ] **C1 — write auditável unificado + avançar/rejeitar per-etapa em todo o funil** — sem isso o funil não anda; é a fundação das demais
- [ ] **C3 — CV + análise IA completa no candidate profile do RH** — o humano precisa ver o que a IA viu (RNF-07a real); barato e independente
- [ ] **C4 — work-queue cross-vaga + KPIs essenciais (K2, K3, K4, K5)** — o "argumento de existência" perante o sponsor
- [ ] **C5 — reject-do-comparativo com justificativa** — aplicação barata de C1; fecha bug de confiança
- [ ] **C2 — agendamento mínimo (data/hora/link|local) + card no painel do candidato** — tira a etapa 4 do WhatsApp

### Add After Validation (M6 v1.x)
- [ ] Retrocesso auditado (mover para etapa anterior)
- [ ] `.ics` download + lembrete 24h no painel
- [ ] `compareceu` + KPI de no-show (K10)
- [ ] time-to-hire (K6), taxa de knockout (K7), drop por etapa (K8)
- [ ] Flag "manter no banco" na rejeição

### Future Consideration (M7+ / backlog — fora do M6)
- [ ] COMM: e-mail transacional / convite de entrevista / `.ics` por e-mail (deferido por decisão de escopo)
- [ ] Self-scheduling / calendar-sync / MS Bookings
- [ ] Banco de talentos + re-candidatura (TALENT)
- [ ] Relatórios completos + export CSV/PDF
- [ ] Source-of-hire por vaga (dado não coletado hoje)

---

## Feature Prioritization Matrix

| Feature | User Value | Impl. Cost | Priority |
|---|---|---|---|
| C1 avançar/rejeitar per-etapa (write auditável) | HIGH | MEDIUM | P1 |
| C5 reject-do-comparativo c/ justificativa | HIGH | LOW | P1 |
| C3 CV + análise IA visível ao RH | HIGH | MEDIUM | P1 |
| C4 work-queue + KPIs K2/K3/K4/K5 | HIGH | MEDIUM/HIGH | P1 |
| C2 agendamento mínimo + card no painel | HIGH | MEDIUM | P1 |
| Retrocesso auditado | MEDIUM | MEDIUM | P2 |
| `.ics` + lembrete 24h painel | MEDIUM | LOW | P2 |
| `compareceu` + no-show KPI | MEDIUM | LOW | P2 |
| time-to-hire / knockout / drop KPIs | MEDIUM | LOW/MEDIUM | P2 |
| Source-of-hire | LOW | LOW | P3 |
| Remover suíte Recharts M1 morta | MEDIUM (confiança) | LOW | P2 |

---

## Competitor Feature Analysis

| Feature | Greenhouse / Lever | Ashby / Workable | Nossa abordagem (M6) |
|---|---|---|---|
| Mover por stages nomeados | Carimba data+usuário; disposition reason | Move p/ frente **e** trás; archive reason | Igual, sobre `etapa_processo` + `historico`; **justificativa obrigatória** (não só dropdown) |
| Rejection reason | Preloaded, editável, estruturada | `rejected by org/candidate/other` | Enum pt-BR curto **+** justificativa textual ≥50 (RNF-07a/Art.20) |
| Aging / stuck alerts | "My tasks" / dashboard | Alerts >5 dias no pipeline | Badge SLA + work-queue cross-vaga sobre K2 |
| Agendamento | Aba Stages + **convite por e-mail + .ics + interview kit** | Automação de scheduling nativa | **Diverge:** só painel (sem e-mail) + `.ics` download |
| Candidate profile | Hub único: CV, feed, scorecards | Idem + análise | Hub RH com CV (signed URL) + análise IA completa + histórico |
| Stage velocity report | Tempo médio por etapa | Hiring velocity report | RPC sobre `historico`; **mediana**, não média |

---

## Sources

- [AIHR — 23 Recruiting Metrics](https://www.aihr.com/blog/recruiting-metrics/) — definições time-to-hire, time-to-fill, yield ratio, offer acceptance, source of hire (HIGH)
- [hrtutorial — Recruitment Funnel Metrics: Stages, Formulas & Examples](https://hrtutorial.com/talent-acquisition/talent-acquisition-metrics-analytics/recruitment-funnel-metrics/) — yield ratio por etapa, funnel effectiveness (MEDIUM)
- [Treegarden — Recruitment SLA Management](https://treegarden.io/blog/recruitment-sla-management/) — time-in-stage via timestamp de transição, average stage duration, SLA breach rate (MEDIUM)
- [Workable Help — Identify hiring workflow bottlenecks](https://help.workable.com/hc/en-us/articles/360057521374-Best-Practices-Identify-and-address-hiring-workflow-bottlenecks) e [Moving candidates through the pipeline](https://help.workable.com/hc/en-us/articles/8495289154839-Moving-candidates-through-the-pipeline) — mover p/ frente e trás, hiring velocity report (MEDIUM/HIGH)
- [Greenhouse Support — Schedule an interview manually](https://support.greenhouse.io/hc/en-us/articles/360045420091-Schedule-an-interview-manually), [Using the new candidate profile](https://support.greenhouse.io/hc/en-us/articles/11957068130971-Using-the-new-candidate-profile), [Interview kits](https://support.greenhouse.io/hc/en-us/articles/115002226826-Interviewer-guide-How-to-use-interview-kits) — scheduling na aba Stages, activity feed, candidate profile como hub (HIGH)
- [OutSolve — Audit Candidate Disposition Reasons](https://www.outsolve.com/blog/why-all-employers-need-to-audit-candidate-disposition-reasons) — porque dropdown genérico de rejeição é anti-padrão de compliance (MEDIUM)
- [Ashby Docs — Candidate Profile](https://docs.ashbyhq.com/candidate-profile) e [Application Review](https://docs.ashbyhq.com/application-review) — mover p/ etapa anterior, archive reason, alerts >5 dias (MEDIUM)
- [Outsail — Greenhouse vs Lever vs Ashby](https://www.outsail.co/post/greenhouse-vs-lever-vs-ashby) — posicionamento dos 4 ATS (scheduling/analytics/UX) (LOW)
- Contexto interno: `.planning/M4-PRODUCT-EVALUATION.md` (Eixo A/B/D — B2/B3/B4/B5/B6/B7/B9, D1/F1), `.planning/M4-CANDIDATE-JOURNEY.md`, `.planning/M5-DRAFT.md` (grupo OPER), `.planning/PROJECT.md` (invariantes RNF-07a/RNF-12a, schema `historico_candidatura`/`registrar_decisao`/`etapa_processo`)

---
*Feature research for: ATS funnel-operation (M6 — Operação do Funil RH)*
*Researched: 2026-07-14*
