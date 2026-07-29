# Feature Research — M8 "Dados do Candidato & Direitos do Titular" (LGPD-OPS)

**Domain:** ATS / recrutamento — camada de governança de dados sob a LGPD (Lei 13.709/2018)
**Researched:** 2026-07-29
**Confidence:** MEDIUM overall — texto de lei HIGH (verbatim, ≥2 fontes independentes incl. gov.br/anpd) · normas de mercado MEDIUM · **números de retenção LOW como fato / são decisão de negócio**

> Substitui a pesquisa de features do M7 (COMM, 2026-07-17, arquivada em `milestones/v7.0-*`). Escopo agora = o grupo **LGPD-OPS**. **Não** re-pesquisar: funil, agendamento, triagem por IA, pipeline de e-mail — tudo isso já shipou (M2–M7). Este documento cobre apenas o que é **novo**: direitos do titular, retenção/purga, fila Art. 20, consentimentos órfãos, exclusão/portabilidade.

---

## 0. Como ler este documento

| Tag | Significado |
|-----|-------------|
| `[LEI]` | Texto do estatuto, verificado verbatim em ≥2 fontes independentes (lgpd-brasil.info + gov.br/anpd). Tratar como fato. |
| `[MERCADO]` | Convenção de mercado / prática de fornecedor. Defensável, **não** é obrigação legal. |
| `[GDPR-ANALOGIA]` | Mecanismo/UX importado do regime europeu. **Não vincula no Brasil.** Usado só onde o padrão de produto transfere. |
| `[DOUTRINA]` | Interpretação jurídica em disputa. Sinalizar ao advogado; não travar em código. |
| `[DECISÃO DE NEGÓCIO]` | Não é escolha de engenharia. Precisa do operador (Beauty Smile) e/ou advogado trabalhista. |

**Complexidade:** S (dias) · M (uma fase) · L (fase inteira, alto risco).

---

## 1. Correções ao entendimento atual do projeto — ler antes de escrever requirements

Três premissas registradas no `## Current Milestone` do `PROJECT.md` estão **imprecisas**. Corrigi-las muda o desenho.

### 1.1 O prazo de 15 dias NÃO é do Art. 18 §1º — e não se aplica ao Art. 20

O `PROJECT.md` diz: *"Fecha o buraco ativo com prazo legal de 15 dias (Art. 18 §1º)."* Errado em duas camadas.

`[LEI]` **Art. 18 §1º** é o direito de *peticionar à ANPD* contra o controlador — nada a ver com prazo de atendimento.

`[LEI]` O prazo de 15 dias é do **Art. 19, II**, verbatim:

> Art. 19. A confirmação de existência ou o acesso a dados pessoais serão providenciados, mediante requisição do titular:
> I – em formato simplificado, **imediatamente**; ou
> II – por meio de declaração clara e completa, que indique a origem dos dados, a inexistência de registro, os critérios utilizados e a finalidade do tratamento, observados os segredos comercial e industrial, fornecida **no prazo de até 15 (quinze) dias**, contado da data do requerimento do titular.

Três consequências práticas:

1. **São 15 dias corridos, não úteis.** O texto legal diz "15 (quinze) dias" sem "úteis". Várias fontes secundárias (inclusive blogs de compliance) escrevem "15 dias úteis" — está errado. Contar corridos é a leitura conservadora e correta.
2. **O Art. 19, I exige resposta IMEDIATA em formato simplificado.** Mais exigente do que o projeto assume — e, ironicamente, o projeto **já cumpre**: o painel autenticado do candidato *é* a confirmação simplificada imediata. O trabalho é **rotular**, não construir.
3. **O Art. 20 (revisão de decisão) não tem prazo legal nenhum.** Nem 15 dias, nem outro. Qualquer SLA na fila de revisão é **compromisso voluntário do produto**. → `[DECISÃO DE NEGÓCIO] BD-4`.

`[LEI]` **Art. 18 §5º**: o requerimento é atendido sem custo, *"nos prazos e nos termos previstos em regulamento"*. `[MERCADO/ANPD]` Esse regulamento **não existe até 2026**: a ANPD abriu Tomada de Subsídios (TS 02/2024) sobre direitos dos titulares e mantém o tema na Agenda Regulatória 2025-2026 e no Mapa de Temas Prioritários 2026-2027 — como eixo de **fiscalização**, não só de norma. Ou seja: os 15 dias do Art. 19, II são o único número duro hoje; vale ancorar SLAs internos nele por consistência.

`[LEI]` **Art. 18 §4º** dá a válvula operacional: se a providência imediata for impossível, o controlador deve responder indicando *"as razões de fato ou de direito que impedem a adoção imediata da providência"*. → padrão correto: **acusar recebimento na hora, resolver dentro da janela**.

### 1.2 "Revisão por pessoa natural" é compromisso do produto, não exigência da lei

`[LEI]` A expressão **"por pessoa natural" foi VETADA** do Art. 20 caput, e o **Congresso Nacional manteve o veto em 02/10/2019** (registro Serpro/LGPD). Texto vigente:

> Art. 20. O titular dos dados tem direito a solicitar a revisão de decisões tomadas **unicamente** com base em tratamento automatizado de dados pessoais que afetem seus interesses [...]
> § 1º O controlador deverá fornecer, sempre que solicitadas, informações claras e adequadas a respeito dos critérios e dos procedimentos utilizados para a decisão automatizada, observados os segredos comercial e industrial.
> § 2º Em caso de não oferecimento de informações de que trata o § 1º [...] baseado na observância de segredo comercial e industrial, a autoridade nacional poderá realizar auditoria para verificação de aspectos discriminatórios [...]
> § 3º **(VETADO)**

Duas consequências que mudam o enquadramento do M8:

1. **A lei não obriga revisão humana.** Vetado o "por pessoa natural", a revisão poderia, em tese, ser feita por outra máquina.
2. **A palavra "unicamente" provavelmente exclui este sistema do Art. 20.** A invariante **RNF-07a** garante que nenhum candidato é rejeitado automaticamente por score — há sempre decisão humana com justificativa ≥50 chars e `por_usuario NOT NULL`. `[DOUTRINA]` Decisões *híbridas* com participação humana genuína caem fora do "unicamente" (IDP, Migalhas, ConJur discutem exatamente isso) — mas a mesma doutrina alerta que **carimbo humano não deveria isentar**.

**Portanto:** o botão "Solicitar revisão por pessoa natural" que já está em PROD é uma **promessa voluntária mais forte que a lei**. Não é problema — é ativo. Mas cria dever contratual/consumerista de honrá-la, e hoje ela é descumprida.

`[GDPR-ANALOGIA]` O padrão europeu (WP251/EDPB; CJEU *SCHUFA* C-634/21, dez/2023) define o que faz a revisão ser real: **pessoa competente, com autoridade efetiva para reverter a decisão**; carimbo não quebra a cadeia. É o padrão de **qualidade** a copiar, não obrigação brasileira.

→ `[DECISÃO DE NEGÓCIO] BD-3`: honrar o rótulo (recomendado — barato, e a RNF-07a já garante a substância) **ou** reescrever o botão. Manter o rótulo sem fila é a única opção insustentável — e é o estado atual.

### 1.3 O direito de exclusão (Art. 18 VI) é mais estreito que "apaga tudo"

`[LEI]` **Art. 18, VI**: *"eliminação dos dados pessoais tratados **com o consentimento do titular**, exceto nas hipóteses previstas no art. 16"*. A ANPD confirma isso na página oficial de direitos do titular.

Decisivo para o desenho. Os dados centrais de uma candidatura **não são tratados com base em consentimento** — a base correta é `[LEI]` **Art. 7º, V** (*"para a execução de contrato ou de **procedimentos preliminares relacionados a contrato** do qual seja parte o titular"*). Uma candidatura a emprego é literalmente procedimento preliminar de contrato.

Consequências:

- Um checkbox obrigatório "autorizo o uso dos meus dados" que bloqueia o cadastro **não é consentimento válido** (`[LEI]` Art. 8 §4: o consentimento refere-se a finalidades determinadas, autorizações genéricas são nulas; e consentimento condicionante da prestação é viciado). Ele é, na prática, um **aceite do aviso de privacidade**.
- Logo, `autorizacao_uso_dados` está **mal rotulado**, e o Art. 18 VI **não alcança o núcleo da candidatura**.
- Resta `[LEI]` **Art. 18, IV** — *anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade* — que **é** o fundamento correto da purga por retenção. Quando a finalidade termina (Art. 15, I), o dado vira "desnecessário" e cai no Art. 18 IV **independentemente de consentimento**.

**Boa notícia jurídica, má notícia de UX:** o produto pode legitimamente reter parte do dado, mas precisa dizer isso honestamente. Ver §3.5 e a anti-feature AF-1.

### 1.4 Gap não mapeado no escopo: Art. 18, VII (compartilhamento) e Art. 41 (encarregado)

`[LEI]` **Art. 18, VII**: o titular tem direito a *"informação das entidades públicas e privadas com as quais o controlador realizou uso compartilhado de dados"*. Este ATS compartilha dados pessoais com, no mínimo: **Resend** (e-mail transacional, M7), o **provedor de LLM** (triagem/avaliação por IA), **Supabase** (DB/Storage) e **Vercel** (hosting). O escopo do M8 no `PROJECT.md` não menciona isso.

O compartilhamento com o provedor de IA é o mais sensível: currículo, redação cultural e respostas comportamentais saem do país para inferência. Isso aciona também `[LEI]` Art. 33 (transferência internacional) e a **Resolução CD/ANPD nº 19/2024** (Regulamento de Transferência Internacional, cláusulas-padrão contratuais, período de graça encerrado em ago/2025).

`[LEI]` **Art. 41** exige indicar um **encarregado (DPO)** e **divulgar publicamente** identidade e contato. `[DOUTRINA]` A Resolução CD/ANPD nº 2/2022 flexibiliza a *nomeação* para agentes de pequeno porte mantendo a exigência de canal de comunicação — **não verifiquei nesta pesquisa** se a Beauty Smile se enquadra. → advogado, não roadmap.

---

## 2. Feature Landscape

### 2.1 Table Stakes — um ATS brasileiro é negligente sem isso

| # | Feature | Por que é esperado (base) | Complexidade | Dependências no que já existe |
|---|---------|---------------------------|--------------|-------------------------------|
| **TS-1** | **Fila Art. 20 no RH** — lista de `revisao_solicitada_em IS NOT NULL AND revisao_resultado IS NULL`, com idade do pedido, badge de SLA, decisor original, ação de escrever `revisao_resultado` | O botão já está em PROD e não alcança ninguém. `[DOUTRINA]` juridicamente é compromisso voluntário; **operacionalmente é dívida ativa** | **M** | Colunas `revisao_solicitada_em`/`revisao_resultado`/`explicacao_solicitada_em` (M2/P15, RLS own-row + allowlist) · padrão "Fila de trabalho" cross-vaga (M6/P34) · `config_sla_etapa` (M7/P37) para o badge · **W-1** (Histórico renderiza `ator` UUID — a fila precisa do nome; o join `usuarios_rh` resolve os dois de uma vez) |
| **TS-2** | **Notificação do pedido ao RH + do resultado ao candidato** — trigger na transição `revisao_solicitada_em` NULL→NOT NULL e na escrita de `revisao_resultado` | Sem isso a fila é um painel que ninguém abre — exatamente o modo de falha atual | **S** | **Pipeline COMM (M7) inteiro**: EF `notificar-candidato`, `notificacoes_enviadas` com `UNIQUE(dedupe_key)`, trigger CASE em `historico_candidatura` (P39), reconciliação Svix (P41). Substitui o `trg_n8n_revisao_decisao` DROPado pela P39 |
| **TS-3** | **Acuse de recebimento imediato ao candidato** ("recebemos seu pedido em DD/MM, retornaremos até DD/MM") | `[LEI]` Art. 18 §4º — se não dá pra atender na hora, é **obrigatório** responder dizendo por quê/quando | **S** | `src/features/explicacao/` (`SolicitarRevisaoCTA`, `ExplicacaoCandidatoPage`, `explicacaoService`) · COMM |
| **TS-4** | **Motor de retenção: matriz estado-da-candidatura × artefato**, com purga agendada | `[LEI]` Art. 15 I + Art. 6 III (necessidade) + Art. 18 IV. `[MERCADO]` Greenhouse e Lever tratam isso como **regra configurável por cliente**, nunca como constante | **L** | `pg_cron` (já em uso na varredura de retry da P41) · tombstone TS-5 · **BD-1** (o número) |
| **TS-5** | **Primitivo de anonimização (tombstone)** — nulifica PII em `candidatos`, marca `anonimizado_em`, preserva FKs e o append-only | `[LEI]` Art. 16, IV permite conservar para *uso exclusivo do controlador, vedado acesso por terceiro, desde que anonimizados*. É o que resolve a "tensão central" do milestone | **L** | Grafo de FKs (`candidaturas`, `historico_candidatura`, `decisao_final.por_usuario NOT NULL`, `bias_audit_log`, `scores_candidato`, `agendamentos_entrevista`, `notificacoes_enviadas`) · bucket `curriculos` · RLS 100% · ver `.planning/research/FK-AUDIT-LIVE.md` |
| **TS-6** | **Pedido de exclusão pelo candidato com recibo honesto** — tela que diz, item a item, **o que foi apagado, o que permanece e por quê** | `[LEI]` Art. 18 VI + Art. 16. Dizer "excluído" e reter é declaração falsa ao titular — ver AF-1 | **M** | TS-5 · COMM · padrão de página de transparência da feature `explicacao` |
| **TS-7** | **Exportação self-service dos próprios dados** (Art. 19 §3 — **não** Art. 18 V; ver §3.6) | `[LEI]` Art. 19 §3: quando o tratamento tem origem em consentimento **ou contrato**, o titular pode pedir cópia eletrônica integral em formato que permita uso subsequente. Candidatura = contrato preliminar (Art. 7 V) → **acionável hoje** | **M** | Padrão EF *authenticate-THEN-authorize* + signed URL curto (`get-curriculo-url`, M6/P32) · COMM ("seu arquivo está pronto") |
| **TS-8** | **Consentimentos órfãos: honrar ou remover** — `autorizacao_retencao_curriculo` vira insumo da purga; `autorizacao_comunicacao` e `autorizacao_analise_video` resolvidos | `[LEI]` Art. 8 §5 (revogação gratuita e facilitada) + Art. 6 (transparência). Checkbox que promete escolha não honrada é pior que não perguntar | **S** | Colunas já gravadas pela EF `cadastrar-candidato` + `_shared/schemas.ts` · `AutorizacoesStep.tsx` · `candidatoSchema.ts` · TS-4 |
| **TS-9** | **Página "com quem compartilhamos seus dados"** — Resend, provedor de LLM, Supabase, Vercel: finalidade e país | `[LEI]` Art. 18, VII (direito literal) + Art. 9 + Art. 33/Res. 19/2024 na transferência internacional | **S** (estática) | Nenhuma. **Gap não mapeado no escopo do M8** |
| **TS-10** | **Retenção do `notificacoes_enviadas`** — purgar destinatário e corpo renderizado; preservar `dedupe_key` + status + timestamp | A P37 diferiu isso explicitamente "a LGPD-OPS (M8+)". Log de e-mail é PII (endereço + conteúdo) | **S** | TS-4 · schema `notificacoes_enviadas` (P37) |
| **TS-11** | **"Seus dados" no painel — confirmação simplificada imediata** (Art. 19, I) | `[LEI]` Art. 19, I exige resposta **imediata** em formato simplificado. O painel autenticado já é isso; falta nomear e completar | **S** | Painel do candidato (M6/P35, M7/P40) |
| **TS-12** | **Prova do consentimento** — gravar versão/hash do texto exibido + timestamp, não só o boolean | `[LEI]` Art. 8 §2: *"cabe ao controlador o ônus da prova de que o consentimento foi obtido"*. Um `boolean true` não prova **a que texto** a pessoa consentiu | **S/M** | `AutorizacoesStep` · EF `cadastrar-candidato` · migration nova. **Impossível retroativamente** |
| **TS-13** | **Ledger de purga (`purga_log`)** — o quê, quando, sob qual regra, quantas linhas | Sem ledger não há como provar conformidade à ANPD nem depurar purga errada. `[MERCADO]` é por isso que a Greenhouse mantém o passo final manual e notificado | **S** | TS-4 · padrão append-only já provado (`historico_candidatura`, auditoria de usuários do M5) |

### 2.2 Differentiators — vantagem real, custo baixo

| # | Feature | Proposta de valor | Complexidade | Notas |
|---|---------|-------------------|--------------|-------|
| **DF-1** | **Tela "o que guardamos e por quê"** — por artefato: dado, base legal (artigo), prazo, o que acontece na exclusão | Nenhum ATS brasileiro popular mostra isso ao candidato. Converte obrigação chata em sinal de seriedade. E é o texto que o advogado revisa uma vez e nunca mais | **S** | É a **renderização** da matriz de TS-4/TS-5 — se a matriz existe em dados, a tela sai quase de graça |
| **DF-2** | **Revisor ≠ decisor original, com override explícito** | `[GDPR-ANALOGIA]` WP251/SCHUFA: revisão precisa de pessoa com autoridade real de reverter. É o que separa revisão de teatro | **S** | TS-1 · `decisao_final.por_usuario`. **Guard suave, não bloqueio duro** — a Beauty Smile pode ter 1 recrutador ativo; aplicar o padrão anti-lockout do M5 (avisar + exigir motivo registrado) |
| **DF-3** | **Janela de arrependimento cancelável na exclusão** | `[MERCADO]` Gupy usa exatamente isso: registros removidos **10 dias após** a solicitação. Protege quem clicou por engano e protege a empresa de exclusão irreversível durante processo ativo | **S/M** | TS-6 · COMM (e-mail "sua exclusão acontece em N dias — cancelar") |
| **DF-4** | **Snapshot de bias pré-purga** — agregar o EEOC 4/5 em fotografia imutável **antes** de anonimizar | **Resolve a tensão central do milestone.** Sem isso: ou não purga (viola Art. 15 I / 18 IV), ou perde a série histórica de viés (perde a defesa do Art. 20 §2 e a auditoria EEOC 4/5) | **M** | `bias_audit_log` mensal + export CSV (M2/P15) · TS-5. Cuidado com célula pequena → PIT-2 |
| **DF-5** | **Janela de retenção em tabela de config** (`config_retencao`, espelhando `config_sla_etapa` da P37) | O número **vai mudar** quando o advogado opinar, e de novo quando o TALENT chegar. Em migration, cada mudança é um deploy | **S** | Padrão `config_sla_etapa` (P37) já provado |
| **DF-6** | **"Seus dados serão apagados em X dias — quer que a gente guarde?"** no painel, com um clique para estender | Transforma a purga em captação legítima para o banco de talentos, com consentimento fresco, específico e datado. É a pré-condição do TALENT que o `PROJECT.md` pede | **M** | TS-4 · TS-8 (`autorizacao_retencao_curriculo`) · COMM · painel (P40) |
| **DF-7** | **Dry-run de purga para o RH** — "na próxima execução, N candidaturas serão anonimizadas; veja a lista" | Purga de PII é irreversível. Relatório prévio é o `EXPLAIN` antes do `DELETE` | **S/M** | TS-4 · TS-13 |
| **DF-8** | **Página de critérios do Art. 20 §1º** — descreve procedimento e dimensões avaliadas, e afirma que ninguém é rejeitado automaticamente por score | `[LEI]` Art. 20 §1 pede exatamente "critérios e procedimentos", com ressalva de segredo comercial. A RNF-07a vira argumento público, não só invariante técnica. Compatível com **D-15** — ver §3.4 | **S** | RNF-07a · feature `explicacao` |

### 2.3 Anti-Features — parecem conformidade, criam risco ou teatro

| # | Anti-feature | Por que é pedida | Por que é problemática | Alternativa |
|---|--------------|------------------|------------------------|-------------|
| **AF-1** | **Botão "Excluir todos os meus dados" que na verdade retém trilha de decisão, bias log e histórico** | É o gesto máximo aparente de conformidade; é o que o candidato pede | **Declaração falsa ao titular.** `[LEI]` Art. 16 autoriza a conservação, mas Art. 6 VI (transparência) e Art. 9 obrigam a informar. Prometer "tudo" e reter dá o pior dos dois mundos: mesma retenção **mais** risco reputacional e sancionatório | Recibo honesto em duas colunas — **APAGADO** vs **MANTIDO + artigo + prazo** (TS-6 + DF-1) |
| **AF-2** | **Hard-delete da linha `candidatos` / `ON DELETE CASCADE`** | "Excluir é excluir" | Quebra `decisao_final.por_usuario NOT NULL`, destrói `historico_candidatura` append-only, mata o `bias_audit_log`, e elimina a **prova de não-discriminação** (`[LEI]` Art. 7 VI + Lei 9.029/1995). Também impede detectar re-candidatura fraudulenta | **Tombstone + anonimização irreversível** (TS-5). `[MERCADO]` É o default da indústria: a Lever oferece *anonimização*, não deleção, como mecanismo primário |
| **AF-3** | **Anonimizar por hash do e-mail/CPF** | Barato, "irreversível", preserva unicidade | **Não é anonimização.** `[LEI]` Art. 5 III + Art. 12: se reversível com esforço razoável, continua sendo dado pessoal. Hash de e-mail cai por dicionário/rainbow ou por lookup de candidato conhecido | Surrogate aleatório sem tabela de mapeamento + PII **nulificada**. Se precisar de unicidade anti-recandidatura: HMAC com chave em Vault **e chamar de pseudonimização, não anonimização** |
| **AF-4** | **Cron de purga que executa direto, sem marcação nem ledger** | É a implementação óbvia de `pg_cron` | Um `WHERE` errado apaga PII de produção **irrecuperavelmente**. Este projeto já viu duas vezes um caminho fechar sem verificação e sair defeituoso em PROD (P39: CR-01/CR-02) | Duas fases: **marcar elegível → relatar → executar**, com `purga_log` (TS-13) e dry-run (DF-7). `[MERCADO]` A Greenhouse mantém deliberadamente o último passo manual e notificado — por esse exato motivo |
| **AF-5** | **"Revisão" que só confirma** (escreve nota, não muda resultado) | Fecha a fila, é fácil de implementar | Teatro. `[GDPR-ANALOGIA]` SCHUFA/WP251: carimbo não conta como revisão. Pior: cria trilha escrita provando que a revisão é decorativa | Enum com **`revertida`** como caminho real, reusando o write-path auditável `avancar_etapa()` do M6 |
| **AF-6** | **"Fale com nosso DPO: dpo@empresa.com" como canal único de direitos** | É o que quase todo site brasileiro faz; parece suficiente | Caixa de entrada não monitorada, sem SLA, sem trilha, sem métrica. **É exatamente o modo de falha que este projeto já tem** com `revisao_solicitada_em` | Fila in-product com SLA (TS-1) + e-mail do encarregado como canal *adicional* (`[LEI]` Art. 41 §1) |
| **AF-7** | **Campanha de re-consentimento ("seu consentimento expira, clique para renovar")** | Preserva o banco de talentos sem apagar nada | E-mail de retenção para gente que pode ter pedido esquecimento. Alto risco de reclamação à ANPD, baixa conversão, e colide com "transacional sem opt-out" travado no M7 | Deixar expirar e **purgar**. O convite para ficar (DF-6) acontece **dentro do painel**, quando o candidato já está lá — pull, não push |
| **AF-8** | **Checkbox granular para tratamento que não é baseado em consentimento** | "Granularidade é boa prática LGPD" | Oferecer um "não" que você vai sobrepor é o pior desenho possível. É literalmente o achado 🟡 do kickoff: `autorizacao_comunicacao` promete escolha sobre e-mail que o M7 decidiu (corretamente) ser transacional sob Art. 7 V | Consentimento **só** onde há escolha real (retenção pós-processo, banco de talentos, vídeo). Para o resto: **declaração informativa** com a base legal nomeada |
| **AF-9** | **Exportar o log de auditoria completo para o candidato** | "Acesso total é transparência" | `historico_candidatura` e `observacoes_rh` contêm nomes de recrutadores, notas internas e, no comparativo, contexto de **outros candidatos**. Vazamento horizontal disfarçado de conformidade | Export **curado por allowlist** — a mesma disciplina que o projeto já aplica (nunca `select('*')` candidate-facing) |
| **AF-10** | **Purga disponível durante candidatura ativa, sem fricção** | "Direito é direito, a qualquer momento" | Candidato apaga tudo no meio da entrevista; o RH perde o processo e a empresa perde a prova de que conduziu corretamente. `[LEI]` Art. 7 V sustenta o tratamento enquanto o procedimento preliminar corre | Distinguir **desistir da candidatura** (encerra a finalidade → inicia o relógio) de **excluir dados** (executa após o encerramento), e explicar isso na tela. → `[DECISÃO DE NEGÓCIO] BD-5` |

---

## 3. Análise por eixo da pergunta

### 3.1 Art. 18 na prática — o que se aplica a recrutamento

| Inciso | Direito | Aplica ao ATS? | Prazo | Comumente implementado? |
|--------|---------|----------------|-------|-------------------------|
| **I** | Confirmação da existência de tratamento | **Sim** | `[LEI]` Art. 19, I — **imediato**, formato simplificado | Quase sempre pulado como *feature*, mas satisfeito de fato pelo painel autenticado → TS-11 (barato) |
| **II** | Acesso aos dados | **Sim** | `[LEI]` Art. 19, II — 15 dias corridos para a declaração completa | Implementado como "portal do titular" (Gupy) → TS-7 |
| **III** | Correção | **Sim** | Sem número legal; ancorar nos mesmos 15 dias | Quase sempre resolvido por **auto-serviço de edição de perfil** — o projeto já tem o análogo no lado RH (M5/A37). Baixo custo |
| **IV** | Anonimização, bloqueio, eliminação de dados **desnecessários/excessivos/em desconformidade** | **Sim — é o inciso que de fato importa aqui** | Sem número legal | Quase sempre pulado. **É a base jurídica correta da purga por retenção**, independente de consentimento → TS-4/TS-5 |
| **V** | Portabilidade a outro fornecedor | Formalmente sim, **praticamente dormente** | — | Praticamente ninguém implementa. Ver §3.6 |
| **VI** | Eliminação de dados tratados **com consentimento** | **Sim, escopo estreito** (§1.3) | Sem número legal | Implementado como "excluir minha conta". É onde nasce a AF-1 |
| **VII** | Informação sobre compartilhamento | **Sim** | — | **Sistematicamente pulado.** Gap deste projeto → TS-9 |
| **VIII** | Informação sobre não consentir e as consequências | **Sim** | No momento da coleta | Parcialmente atendido pelo `AutorizacoesStep`; falta declarar a consequência de cada "não" |
| **IX** | Revogação do consentimento (`[LEI]` Art. 8 §5 — gratuita e facilitada) | **Sim** | Imediato na prática | **Pulado neste projeto**: checkboxes no cadastro, nenhum toggle no painel → TS-8 |

**"Resposta imediata" vs 15 dias, em termos operacionais:**

- **Imediato (Art. 19, I)** = o candidato consegue ver, agora, sem pedir nada a ninguém, que existem dados dele e quais são em linhas gerais. Um painel autenticado satisfaz. **Não** exige processo humano.
- **15 dias (Art. 19, II)** = a declaração completa (origem, critérios, finalidade). Exige artefato gerado — o export. Pode ser assíncrono; o que não pode é passar de 15 dias corridos.
- **Art. 18 §4º** cobre o intervalo: se não dá pra fazer na hora, responda dizendo por quê → **o acuse de recebimento é obrigatório, não cortesia**.
- **Regra de bolso para o roadmap:** tudo que puder ser servido pelo painel deve ser servido pelo painel — vira "imediato" e some da fila humana. Só o que exige julgamento (Art. 20; exclusão com conflito de retenção) entra em fila com SLA.

### 3.2 Retenção — o que os praticantes usam e sob qual base

**O que a lei diz:** `[LEI]` A LGPD **não fixa prazo nenhum**. Art. 15, I termina o tratamento quando *"a finalidade foi alcançada"* ou os dados *"deixaram de ser necessários"*; Art. 6, III (necessidade) e Art. 6, I (finalidade) empurram para **apagar cedo**.

**A força contrária, corretamente identificada:** `[LEI]` **Art. 7º, VI** — *"para o exercício regular de direitos em processo judicial, administrativo ou arbitral"*. Essa é a base legal para conservar prova de decisão. **Não é a CLT.**

**Correção importante sobre a prescrição trabalhista:**

`[LEI]` CLT Art. 11 / CF Art. 7º XXIX = 5 anos no curso do contrato, **limitado a 2 anos após a extinção do contrato**. O relógio começa na **extinção do contrato**. Um candidato **não contratado nunca teve contrato** — logo o prazo bienal **não se aplica diretamente a ele**. Usar "2 anos por prescrição trabalhista" como justificativa de retenção de candidato rejeitado é `[MERCADO]` convenção emprestada da guarda de documentos pós-contratuais, **não obrigação legal**. Isso precisa estar escrito no requirement — senão o número vira folclore com aparência de lei.

O que **de fato** expõe a empresa em relação a um candidato rejeitado:
- `[LEI]` **Lei 9.029/1995** — proíbe práticas discriminatórias **para efeitos admissionais** (sexo, origem, raça, cor, estado civil, situação familiar, idade). Aplica-se explicitamente à fase de admissão.
- `[DOUTRINA]` Pretensão indenizatória pré-contratual (dano moral). Prazo prescricional em disputa: 3 anos pelo Código Civil (art. 206 §3º, V) vs. aplicação da regra trabalhista pela Justiça do Trabalho. **Não resolvi essa divergência nesta pesquisa** — é pergunta de advogado trabalhista, e é ela que ancora o número.

**Norma de mercado observada:**

| Fonte | Prática | Tag |
|-------|---------|-----|
| Doutrina BR (Migalhas, ConJur, lgpdbrasil, Solides, Rücker Curi) | Apagar ao fim do processo seletivo se não houve contratação; banco de currículos exige informar o prazo e obter concordância | `[MERCADO]` |
| Convenção interna citada por praticantes | **6 meses a 1 ano**, com renovação de consentimento | `[MERCADO]` — não é lei |
| Contratados | ~5 anos pós-contrato (deveres documentais trabalhistas/fiscais) | `[MERCADO]` |
| **Gupy** (maior ATS BR) | Registros de candidatura removidos **10 dias** após o pedido; exclusão automática de conta por **5 anos de inatividade**; banco de talentos fundado em **legítimo interesse (Art. 10, II)** combinado com o interesse manifestado pelo candidato — **não** em consentimento | `[MERCADO]` |
| **Greenhouse / Lever** | Janela de retenção é **configuração do cliente**, por escritório; anonimização como mecanismo primário; expiração de consentimento + "additional retention period" separado | `[GDPR-ANALOGIA]` |

**Recomendação de desenho (opinativa):** não existe "o número". Existe uma **matriz por estado**, e os números são `[DECISÃO DE NEGÓCIO] BD-1`:

| Estado da candidatura | Gatilho do relógio | Sugestão de default para a conversa com o advogado | Racional |
|-----------------------|--------------------|---------------------------------------------------|----------|
| **Em processo** (etapas ativas) | — | **Nunca purgar** | `[LEI]` Art. 7 V — finalidade viva |
| **Rejeitado / knockout** | `decisao_final` ou auto-rejeição por knockout | **12 meses** da decisão (salvo `autorizacao_retencao_curriculo = true` → janela de talentos) | Compromisso entre a norma de mercado (6–12m) e a exposição da Lei 9.029/1995. **Só a trilha de decisão anonimizada sobrevive**, não a PII |
| **Desistente / abandonado** (rascunho sem submissão, inatividade) | Última atividade | **6 meses** | A finalidade nunca se concretizou → necessidade mais fraca |
| **Aprovado mas não contratado** (recusou proposta) | Decisão final | Igual a rejeitado | Mesma exposição |
| **Contratado** | Contratação | **Fora do escopo deste sistema** — congelar registro, marcar handoff manual ao RH/folha | Deveres documentais trabalhistas vivem em outro sistema; não replicar o dever aqui |
| **Banco de talentos** (`autorizacao_retencao_curriculo = true`) | Consentimento | **12–24 meses, renovável, revogável a 1 clique** | `[MERCADO]` Gupy usa 5 anos de inatividade — agressivo demais para controlador único. TALENT é M9+, mas a janela nasce aqui |
| **`notificacoes_enviadas`** | Envio | **12 meses** para corpo/destinatário; `dedupe_key` + status + timestamp permanecem | Log de entrega é PII; o agregado não é. Débito explícito da P37 |
| **`bias_audit_log`** | Snapshot mensal | **Agregado imutável permanece; linhas por candidato caem junto com a PII** | `[LEI]` Art. 16, IV → DF-4 |

**Não trave um número no roadmap sem o parecer.** Trave a **estrutura** (matriz + config em tabela, DF-5) e deixe o número como seed configurável.

### 3.3 A fila Art. 20 — como é uma boa

Como não há prazo legal nem obrigação de revisão humana (§1.2), a fila é definida por **qualidade de produto**, não por conformidade mínima.

| Elemento | Recomendação | Justificativa |
|----------|--------------|---------------|
| **Escopo** | `revisao_solicitada_em IS NOT NULL AND revisao_resultado IS NULL`, cross-vaga | Espelha a "Fila de trabalho" do M6/P34, padrão já provado |
| **Ordenação** | Mais antigo primeiro (não por vaga) | Direito individual não deve competir com prioridade de vaga |
| **Badge de SLA** | Idade em dias vs. SLA interno; vermelho ao estourar | Reusar `config_sla_etapa` (P37) e o badge de SLA da P34 |
| **SLA** | Sugestão: **15 dias corridos**, ancorado no Art. 19 II por consistência — mas é `[DECISÃO DE NEGÓCIO] BD-4`, **não** prazo legal | Art. 20 não tem prazo. Documentar isso no requirement para ninguém escrever "prazo legal" de novo |
| **Quem pode revisar** | Qualquer `usuarios_rh` com papel adequado, **mas** guard suave se for o decisor original | `[GDPR-ANALOGIA]` WP251/SCHUFA. Bloqueio duro pode travar equipe de 1 recrutador → usar o padrão anti-lockout do M5 (avisar + exigir motivo registrado) |
| **O que é gravado** | `revisao_resultado` (enum `mantida` / `revertida` / `reaberta`), `revisao_por_usuario` **NOT NULL**, `revisao_em`, `revisao_justificativa` **≥50 chars server-enforced** | Espelha exatamente o contrato já provado de `decisao_final`. Reuso, não invenção |
| **A revisão pode mudar o resultado?** | **Sim, obrigatoriamente** — `revertida` reabre a candidatura pelo write-path auditável único (`UPDATE candidaturas.etapa_atual` → `avancar_etapa()`) | Sem isso é AF-5. E o write-path já existe desde o M6/P31 — **não criar um segundo** |
| **O que o candidato ouve, e quando** | (a) acuse imediato no clique (TS-3); (b) e-mail do resultado pelo COMM, em linguagem **D-15 neutra** | O canal é o M7 — a dependência já paga |
| **Idempotência / re-pedido** | Um pedido aberto por candidatura; o segundo clique não cria linha nova, mostra o status | Espelha o `UNIQUE(dedupe_key)` do `notificacoes_enviadas` |

### 3.4 A tensão D-15 × Art. 20 §1º — e como resolver

**Conflito aparente:** `[LEI]` Art. 20 §1º obriga a fornecer *"informações claras e adequadas a respeito dos **critérios e procedimentos**"*. A invariante **D-15** diz que a rejeição é neutra e o critério/score **nunca** é exposto.

**Resolução (opinativa e defensável):** falam de coisas diferentes.

- O Art. 20 §1 pede o **procedimento e as categorias de critério**: quais dimensões foram avaliadas, que houve decisão humana, que nenhuma rejeição é automática por score, que existe auditoria mensal de viés. **Nada disso é o score do candidato.**
- O §1 traz a ressalva expressa *"observados os segredos comercial e industrial"* — que cobre rubrica, gabarito, pesos e ranking comparativo.
- Logo: **DF-8 satisfaz o Art. 20 §1 sem violar o D-15.** E a RNF-07a vira o argumento central dessa página.

O mesmo raciocínio vale para o export (TS-7): entra o que o candidato **produziu** e o **estado** do processo; não entram rubrica, gabarito, pesos, `score_match`, `observacoes_rh` nem comparativo.

### 3.5 Apagar vs anonimizar — a matriz honesta

**DEVE SUMIR (delete real, incluindo objeto no Storage):**

| Artefato | Onde | Nota |
|----------|------|------|
| Arquivo de currículo | bucket `curriculos` (privado) | Delete do **objeto**, não só da referência. Verificar órfãos (o M5 já registrou `IN-01 avatar-orphan`) |
| Nome, e-mail, telefone, endereço, data de nascimento | `candidatos` | Nulificar |
| Redação cultural (texto livre autoral) | respostas da avaliação | **Alto risco de re-identificação por estilo/conteúdo.** Sumir |
| Respostas item-a-item (Big Five, SJT, cognitivo) | tabelas de resposta / `scores_candidato` | Sumir as respostas; o **agregado neutro** pode virar snapshot (DF-4) |
| Transcrição/observações de entrevista | `agendamentos_entrevista.observacoes_rh`, entrevista | Texto livre sobre pessoa identificada |
| Destinatário e corpo renderizado de e-mail | `notificacoes_enviadas` | TS-10 |
| Foto/vídeo, se existir | Storage | `autorizacao_analise_video` hoje não tem consumidor — ver TS-8 |

**DEVE PERMANECER (`[LEI]` Art. 16, I e IV + Art. 7º, VI):**

| Artefato | Base | Como permanece |
|----------|------|----------------|
| Fato da decisão + **quem** decidiu + quando + etapa | Art. 7 VI (defesa) + Art. 16 IV | Linha preservada, FK do candidato apontando para o tombstone. `por_usuario NOT NULL` refere-se ao **usuário RH**, não ao candidato — **sobrevive naturalmente** à anonimização do candidato |
| Justificativa ≥50 chars | Art. 7 VI — é literalmente a prova de não-discriminação | Preservar. **Risco:** pode conter PII digitada pelo RH → PIT-3 |
| `historico_candidatura` (transições) | Art. 16 IV | Preservar transições, anonimizar o alvo. Casa com **W-1** (mostrar nome do recrutador em vez de UUID) |
| Snapshot agregado de bias EEOC 4/5 | Art. 16 IV (anonimizado, uso exclusivo do controlador) | **Pré-agregar antes de purgar** (DF-4) |
| `dedupe_key` + status + timestamp de notificação | Necessidade operacional de idempotência | Sem destinatário nem corpo |
| Registro da própria purga | Prova de conformidade | `purga_log` (TS-13) — **isento de purga**, como a auditoria de usuários do M5 |

**Como apresentar isso honestamente** (o padrão que falta no mercado brasileiro): recibo em duas colunas, com o artigo ao lado de cada item retido e um prazo. Literalmente:

> **Apagamos:** seu currículo, seus dados de contato, suas respostas e sua redação.
> **Mantivemos, de forma anonimizada:** o registro de que uma decisão foi tomada, por qual pessoa e com qual justificativa — necessário para defesa em eventual processo (LGPD art. 7º, VI) e conservado sob o art. 16, IV. Esse registro **não permite mais identificar você**.

### 3.6 Portabilidade / exportação — o que entregar de fato

`[LEI]` **Art. 18, V** (portabilidade a outro fornecedor) depende de regulamentação da ANPD sobre padrões de interoperabilidade (`[LEI]` Art. 40). **Essa regulamentação não existe para dados de RH até 2026.**

⚠️ **Armadilha de pesquisa verificada:** múltiplas fontes secundárias afirmam que a *Resolução CD/ANPD nº 19/2024* fixou JSON/CSV como formatos de portabilidade. **É falso.** A Res. 19/2024 é o **Regulamento de Transferência Internacional de Dados** (cláusulas-padrão contratuais, DOU 23/08/2024). Uma das fontes também inventou atribuição semelhante à Res. 2/2022. **Não citar nenhuma das duas como fundamento de portabilidade** — nem em requirement, nem em texto candidate-facing.

`[LEI]` **Art. 18, §7º**: a portabilidade não inclui dados já anonimizados pelo controlador.

**O direito acionável hoje** é `[LEI]` **Art. 19, §3º**:

> Quando o tratamento tiver origem no consentimento do titular **ou em contrato**, o titular poderá solicitar **cópia eletrônica integral** de seus dados pessoais, observados os segredos comercial e industrial, nos termos de regulamentação da autoridade nacional, em **formato que permita a sua utilização subsequente**, inclusive em outras operações de tratamento.

Candidatura = procedimento preliminar de contrato (Art. 7 V) → **cai na hipótese "contrato"**.

| Aspecto | Recomendação |
|---------|--------------|
| **Enquadramento** | Chamar de "cópia dos seus dados" (Art. 19 §3), **não** de "portabilidade" (Art. 18 V). Promete menos e entrega o que é exigível |
| **Formato** | **JSON** (estruturado, legível por máquina) **+ PDF/HTML** legível por humano, num ZIP com o arquivo de currículo original |
| **Conteúdo** | Cadastro, candidaturas, histórico de etapas com datas, respostas que o candidato escreveu, devolutiva Big Five em **bandas neutras** (a decisão UX-07 do M4 já removeu o percentil bruto — manter consistente), agendamentos, e-mails enviados (assunto + data, **não** o corpo) |
| **Não entra** | Rubrica, gabarito, pesos, `score_match`, ranking comparativo, `observacoes_rh`, prompts de IA, nomes de recrutadores em notas internas → AF-9 |
| **Entrega** | **Download autenticado no painel**, via signed URL de TTL curto — reusar o padrão *authenticate-THEN-authorize* da EF `get-curriculo-url` (M6/P32). **Nunca anexar por e-mail** |
| **Assíncrono** | Pedido → job → e-mail "seu arquivo está pronto" (novo evento COMM) → download autenticado. Registrar o download |
| **Prazo** | Ancorar nos 15 dias corridos do Art. 19 II. Na prática sai em minutos; o compromisso público é 15 dias |

### 3.7 Consentimentos — a resolução padrão para checkbox órfão

**Princípio:** um checkbox só deve existir onde o "não" é **respeitado**. Onde a base legal não é consentimento, use **declaração informativa com a base nomeada** — não um controle falso.

| Flag atual | Base legal real | Recomendação | Complexidade |
|------------|-----------------|--------------|--------------|
| `autorizacao_uso_dados` (obrigatório) | **Não é consentimento** — checkbox obrigatório que bloqueia o cadastro é consentimento viciado (`[LEI]` Art. 8 §4). A base é **Art. 7º, V** (procedimento preliminar de contrato) | **Re-rotular como "li e aceito o Aviso de Privacidade"**, mantendo o registro. Não fingir que é consentimento — o que, aliás, **fortalece** a posição da empresa (Art. 18 VI não alcança) | **S** |
| `autorizacao_comunicacao` | Art. 7 V — e-mail transacional do funil é parte do serviço pedido | **REMOVER o checkbox.** Substituir por texto: "enviaremos e-mails sobre o andamento da sua candidatura; isso faz parte do processo e não pode ser desativado". Se quiser um toggle, escopá-lo a comunicações **genuinamente opcionais** (alertas de vaga, banco de talentos — M9+) | **S** |
| `autorizacao_retencao_curriculo` | **Consentimento genuíno** (Art. 7 I) — escolha real | **HONRAR.** Vira insumo direto da matriz de retenção (TS-4) e pré-condição do TALENT. **Tornar revogável no painel** (`[LEI]` Art. 8 §5) | **S** |
| `autorizacao_analise_video` | Nenhuma — **não existe funcionalidade de vídeo** | **REMOVER.** Coletar consentimento para tratamento que não ocorre é falha de minimização e declaração falsa. Recolocar quando (e se) a feature existir | **S** |

**Adicional que ninguém pede e todo mundo devia ter:** `[LEI]` Art. 8 §2 — *"cabe ao controlador o ônus da prova de que o consentimento foi obtido"*. Um `boolean true` não prova **a que texto** a pessoa consentiu. Gravar **versão + hash do texto exibido + timestamp** (TS-12). Barato agora, **impossível retroativamente**.

**Sobre desligar o click tracking do Resend** (item do escopo M8): correto e barato. Rastrear cliques em e-mail **transacional** cria tratamento de comportamento sem base declarada e enfraquece o argumento de "transacional, sem marketing" travado no M7. **Complexidade: S** — configuração no Resend + verificar que a EF `resend-webhook` não depende do evento `clicked` para reconciliar.

---

## 4. Feature Dependencies

```
[COMM pipeline — M7, JÁ EXISTE]
    ├──habilita──> [TS-2 Notificação Art. 20]
    ├──habilita──> [TS-3 Acuse de recebimento]
    ├──habilita──> [TS-6 Aviso de exclusão + DF-3 janela cancelável]
    ├──habilita──> [TS-7 "seu export está pronto"]
    └──habilita──> [DF-6 "seus dados serão apagados em X"]

[TS-5 Tombstone / anonimização]
    └──requer──> [mapa completo de FKs + política por tabela]  (FK-AUDIT-LIVE.md)
    └──requer──> [DF-4 snapshot de bias PRÉ-purga]   <-- ordem obrigatória, irreversível
    └──habilita──> [TS-4 Motor de retenção]
                       ├──habilita──> [TS-10 purga de notificacoes_enviadas]
                       └──habilita──> [TS-13 purga_log] ──habilita──> [DF-7 dry-run]
    └──habilita──> [TS-6 Exclusão a pedido]

[TS-8 Consentimentos] ──alimenta──> [TS-4 Motor de retenção]
                       (autorizacao_retencao_curriculo decide a janela)

[TS-1 Fila Art. 20] ──requer──> [W-1: join usuarios_rh p/ nome do decisor/revisor]
                    ──requer──> [write-path avancar_etapa() do M6, para 'revertida']
[DF-2 revisor != decisor] ──requer──> [TS-1]

[DF-1 "o que guardamos e por quê"] ──é a renderização de──> [matriz de TS-4/TS-5]
[DF-5 config_retencao em tabela] ──desacopla──> [BD-1] de [deploy]

[AF-2 hard-delete] ──CONFLITA──> [decisao_final.por_usuario NOT NULL]
                   ──CONFLITA──> [historico_candidatura append-only]
                   ──CONFLITA──> [bias_audit_log / EEOC 4/5]
[TS-4 purga] ──CONFLITA (resolvido por DF-4)──> [auditoria de viés histórica]
[AF-8 checkbox falso] ──CONFLITA──> [M7: "transacional sem opt-out"]
```

### Notas de dependência

- **TS-5 antes de TS-4.** Não dá para agendar purga sem saber *como* anonimizar sem quebrar FK. O primitivo vem primeiro; o cron depois. Fases separadas.
- **DF-4 antes de qualquer purga real.** Se a purga rodar antes do snapshot agregado existir, a série histórica de viés some para sempre. **Irreversível → tratar como bloqueio de fase, não como nice-to-have.**
- **TS-1 puxa W-1 de graça.** A fila precisa mostrar "decidido por Fulano", e o `historico_candidatura` (VISRH-03) sofre do mesmo defeito. Um join, dois problemas.
- **TS-8 precede TS-4.** `autorizacao_retencao_curriculo` é entrada da matriz. Purga construída sem ler a flag deixa o consentimento órfão — só que agora com aparência de resolvido.
- **`revisao_resultado = 'revertida'` deve reusar `avancar_etapa()`**, não criar um segundo write-path. O M6/P31 estabeleceu write-path auditável **único**; duplicá-lo reabre a classe de bug que o M4/P25 fechou.
- **AF-2 é incompatível com o schema por construção.** Não é preferência: `por_usuario NOT NULL` e o append-only tornam hard-delete impossível sem destruir invariantes já validadas.

---

## 5. Recorte de entrega recomendado

### Núcleo indispensável — o milestone não é honesto sem isso

- [ ] **TS-1 + TS-2 + TS-3** — Fila Art. 20 respondível ponta a ponta. Único item com **buraco ativo em PROD** e um botão que já promete.
- [ ] **TS-5** — Tombstone/anonimização. Sem ele, todo o resto é impossível ou perigoso.
- [ ] **DF-4** — Snapshot de bias pré-purga. Ordem obrigatória; irreversível se pulado.
- [ ] **TS-4 + TS-13 + DF-5** — Motor de retenção com ledger e janela configurável, **sem travar o número** (BD-1).
- [ ] **TS-8** — Consentimentos honrados ou removidos + revogáveis no painel. Fecha o achado 🟡 do kickoff.
- [ ] **TS-6** — Exclusão a pedido com recibo honesto. **Não shipar exclusão sem o recibo** (AF-1).
- [ ] **TS-10** — Purga de `notificacoes_enviadas`. Débito explícito da P37.

### Alto valor, custo baixo — incluir se a fase couber

- [ ] **TS-9** — Página de compartilhamento (Art. 18 VII). Estática, resolve gap não mapeado. Provavelmente o melhor retorno por hora do milestone.
- [ ] **TS-11** — "Seus dados" no painel (Art. 19, I imediato). Quase todo o trabalho já existe.
- [ ] **DF-1** — "O que guardamos e por quê". Renderização da matriz que TS-4 já produz.
- [ ] **DF-8** — Página de critérios do Art. 20 §1º. Transforma a RNF-07a em argumento público.
- [ ] **DF-2** — Revisor ≠ decisor (guard suave).
- [ ] **TS-12** — Prova de consentimento versionada. **Impossível retroativamente** — se não entrar agora, o histórico fica sem prova para sempre.

### Adiar conscientemente

- [ ] **TS-7 (export)** — se a fase apertar. O Art. 19 II dá 15 dias, e um export manual pelo RH atende no volume atual de uma rede de clínicas. **Mas nenhum compromisso público de prazo antes da feature existir.**
- [ ] **DF-3 (janela cancelável)** — se TS-6 já bloquear exclusão durante processo ativo, o risco cai muito.
- [ ] **DF-6 (convite para ficar)** — natural no M9/TALENT. **DF-7 (dry-run)** pode ser query manual no primeiro ciclo.
- [ ] **Portabilidade Art. 18 V real** — dormente até a ANPD regulamentar. Não construir contra norma inexistente.

---

## 6. Feature Prioritization Matrix

| # | Feature | Valor p/ usuário | Custo | Risco se ausente | Prioridade |
|---|---------|------------------|-------|------------------|------------|
| TS-1 | Fila Art. 20 | ALTO | M | **ALTO — promessa quebrada em PROD** | **P1** |
| TS-2 | Notificação Art. 20 | ALTO | S | ALTO | **P1** |
| TS-5 | Tombstone/anonimização | MÉDIO (invisível) | L | ALTO — bloqueia tudo | **P1** |
| DF-4 | Snapshot de bias pré-purga | BAIXO (invisível) | M | **ALTO — perda irreversível** | **P1** |
| TS-4 | Motor de retenção | MÉDIO | L | ALTO — acúmulo indefinido viola Art. 15 I | **P1** |
| TS-8 | Consentimentos honrados/removidos | ALTO | S | ALTO — checkbox mentiroso | **P1** |
| TS-6 | Exclusão + recibo honesto | ALTO | M | ALTO | **P1** |
| TS-3 | Acuse de recebimento | ALTO | S | MÉDIO (Art. 18 §4) | **P1** |
| TS-13 | `purga_log` | BAIXO | S | ALTO — sem prova de conformidade | **P1** |
| TS-10 | Purga `notificacoes_enviadas` | BAIXO | S | MÉDIO — débito P37 | **P2** |
| TS-9 | Página de compartilhamento | MÉDIO | S | MÉDIO (Art. 18 VII literal) | **P2** |
| TS-11 | "Seus dados" no painel | ALTO | S | MÉDIO (Art. 19 I) | **P2** |
| DF-5 | `config_retencao` em tabela | BAIXO | S | MÉDIO — cada mudança vira deploy | **P2** |
| DF-1 | "O que guardamos e por quê" | ALTO | S | BAIXO | **P2** |
| DF-2 | Revisor ≠ decisor | MÉDIO | S | MÉDIO — revisão vira teatro | **P2** |
| DF-8 | Critérios Art. 20 §1 | MÉDIO | S | MÉDIO | **P2** |
| TS-12 | Prova de consentimento | BAIXO | S/M | **MÉDIO e irrecuperável** | **P2** |
| TS-7 | Export self-service | ALTO | M | MÉDIO — 15 dias absorve manual | **P2/P3** |
| DF-3 | Janela cancelável | MÉDIO | S/M | BAIXO | **P3** |
| DF-7 | Dry-run de purga | BAIXO | S/M | BAIXO | **P3** |
| DF-6 | Convite para ficar | MÉDIO | M | BAIXO | **P3** (M9/TALENT) |

---

## 7. Competitor Feature Analysis

| Feature | Gupy (BR) `[MERCADO]` | Greenhouse / Lever `[GDPR-ANALOGIA]` | Nossa abordagem |
|---------|----------------------|--------------------------------------|-----------------|
| Canal de direitos | Portal do Titular dedicado, separado do painel | Portal self-serve de privacidade (Lever) | **Dentro do painel autenticado** — a identidade já está provada, evita fluxo de verificação separado |
| Escopo da exclusão | Dois níveis: dados com **uma empresa** vs conta inteira | Por candidato / em massa | Single-tenant → **um nível só**. Simplificação legítima |
| Execução da exclusão | Permanente **10 dias após** o pedido | Manual após notificação (Greenhouse); anonimização (Lever) | Anonimização por tombstone + janela de arrependimento (DF-3) |
| Mecanismo primário | Exclusão | **Anonimização** (Lever), exclusão de campos (Greenhouse) | **Anonimização** — obrigatório dado `por_usuario NOT NULL` e o append-only |
| Janela de retenção | 5 anos de inatividade (nível plataforma) | **Configurável pelo cliente**, por escritório | **Matriz por estado, em tabela de config** (DF-5). Mais fina que ambos |
| Base do banco de talentos | **Legítimo interesse (Art. 10, II)** + interesse manifestado | Consentimento explícito ou legítimo interesse, configurável | `autorizacao_retencao_curriculo` = **consentimento**. Mais conservador que a Gupy; correto para controlador único sem LIA formalizado |
| Revisão de decisão automatizada | Não exposto ao candidato | Não é feature de ATS (Art. 22 GDPR raramente implementado em ATS) | **Fila Art. 20 real** — não achei equivalente em nenhum dos três. **Diferencial genuíno** |
| Auditoria de viés | Não exposto | Relatórios de EEO/diversidade | EEOC 4/5 mensal **já existe** (M2/P15) — DF-4 a torna resiliente à purga |

**Leitura:** o mercado brasileiro de ATS está resolvido em **exclusão** e ainda fraco em **revisão** e **transparência de retenção**. É onde este projeto pode ser genuinamente melhor — e o custo é baixo, porque o COMM e a trilha auditável já foram pagos.

---

## 8. Riscos e armadilhas de implementação

| # | Armadilha | Por quê | Mitigação |
|---|-----------|---------|-----------|
| **PIT-1** | **Anonimização reversível** | `[LEI]` Art. 5 III + Art. 12: se reversível com esforço razoável, ainda é dado pessoal. Hash de e-mail é reversível | Nulificação + surrogate aleatório sem tabela de mapeamento. Se precisar de anti-recandidatura: HMAC com chave em Vault **e chamar de pseudonimização** |
| **PIT-2** | **Agregado de viés re-identificável** | Vaga com 3 candidatos + recorte demográfico + data → identifica a pessoa mesmo sem nome. O Art. 16 IV exige anonimização **de verdade** | Definir k mínimo por célula no snapshot; suprimir ou agrupar células abaixo do limiar |
| **PIT-3** | **Justificativa ≥50 chars retida contém PII digitada pelo RH** | O texto livre é a prova de não-discriminação (Art. 7 VI) — mas o RH pode ter escrito o nome do candidato | (a) reter e aceitar como pseudonimizado sob Art. 7 VI, ou (b) redigir o campo na anonimização. **Decisão jurídica** → BD-9 |
| **PIT-4** | **Órfão no Storage** | O M5 já registrou `IN-01 avatar-orphan`. Purga que apaga a linha e esquece o objeto deixa PII viva no bucket | Ordem: **Storage primeiro, linha depois**, com varredura de reconciliação — mesmo padrão da varredura `pg_cron` de retry da P41 |
| **PIT-5** | **Purga rodando com `NOTIFICACOES_MODO=teste`** | O backlog `m7-ativar-modo-producao` (**high**) diz que nenhum candidato real recebe e-mail ainda. Purgar sem avisar é pior que não purgar | Gate explícito: purga só liga depois do modo produção — ou modo de purga próprio com kill-switch próprio |
| **PIT-6** | **Fase de purga fechando sem VERIFICATION nem code review** | Já aconteceu: a P39 fechou assim e deixou 2 defeitos CRÍTICOS vivos em PROD. Purga é **irreversível** — a mesma falha aqui destrói dados | Tratar a fase de purga como a de maior risco do milestone (o análogo da P39): VERIFICATION + code review + prova por **execução**, não por leitura |
| **PIT-7** | **Migration PL/pgSQL falhando com 42601** | Padrão conhecido e documentado no `CLAUDE.md`. Este milestone é pesado em `CREATE FUNCTION` | Aplicar via Supabase MCP `apply_migration`, sem wrapper `BEGIN/COMMIT` (decisão já registrada nas Key Decisions) |
| **PIT-8** | **Repetir "prazo legal de 15 dias (Art. 18 §1º)" nos requirements** | Está errado (§1.1) e vai vazar para texto candidate-facing, virando afirmação legal falsa **no produto** | Citar **Art. 19, II** para acesso e afirmar explicitamente que **o Art. 20 não tem prazo legal** |

---

## 9. Decisões de negócio a escalar (não são escolhas de engenharia)

| # | Decisão | Quem decide | Por que não é técnica |
|---|---------|-------------|-----------------------|
| **BD-1** | **Janelas de retenção por estado** (rejeitado / desistente / talentos / notificações) | Operador **+ advogado trabalhista** | Depende da exposição aceita sob Lei 9.029/1995 e da divergência doutrinária sobre prescrição pré-contratual (§3.2). **Não travar número no roadmap** — travar a estrutura (DF-5) |
| **BD-2** | `autorizacao_comunicacao`: honrar ou remover | Operador | Recomendação: **remover** (AF-8). Mas é escolha de produto, e o M7 travou "transacional sem opt-out" |
| **BD-3** | Manter o rótulo "revisão por **pessoa natural**" | Operador | A lei não exige (veto mantido em 2019). Recomendação: **manter e honrar** — a RNF-07a já entrega a substância |
| **BD-4** | SLA da fila Art. 20 | Operador | **Não há prazo legal.** Sugestão: 15 dias corridos, por consistência com o Art. 19 II |
| **BD-5** | Exclusão permitida durante candidatura ativa? | Operador | Recomendação: separar **desistir** de **excluir** (AF-10) |
| **BD-6** | Nomear o provedor de LLM na página do Art. 18 VII | Operador | Transparência vs exposição comercial. `[LEI]` O Art. 18 VII pede a informação; nomear é a leitura conservadora |
| **BD-7** | Duração da janela de arrependimento | Operador | `[MERCADO]` Gupy usa 10 dias |
| **BD-8** | Encarregado (DPO): quem é e onde o contato é publicado | Operador + advogado | `[LEI]` Art. 41 exige indicar e divulgar. `[DOUTRINA]` Res. CD/ANPD 2/2022 flexibiliza para pequeno porte — enquadramento **não verificado** nesta pesquisa |
| **BD-9** | Redigir ou preservar a justificativa ≥50 chars na anonimização | Advogado | PIT-3 |

---

## 10. Lacunas desta pesquisa

1. **Prescrição de pretensão pré-contratual** (candidato rejeitado alegando discriminação): 3 anos (CC art. 206 §3º V) vs regra trabalhista. **Não resolvida.** É a pergunta que ancora BD-1 e precisa de advogado trabalhista, não de mais busca.
2. **Regulamento da ANPD sobre direitos dos titulares**: pendente até 2026 e no Mapa de Temas Prioritários 2026-2027. Pode fixar prazos e formato durante ou logo após o M8 → desenhar o SLA como **configuração**, não constante.
3. **Enquadramento da Beauty Smile como agente de pequeno porte** (Res. CD/ANPD 2/2022, relevante para BD-8): não verificado.
4. **Precedentes sancionatórios da ANPD em recrutamento**: não encontrei casos. Sugere baixa jurisprudência administrativa — mas o Mapa 2026-2027 põe "Direitos dos Titulares" como eixo de **fiscalização**, então ausência de precedente não é garantia.
5. **Transferência internacional para o provedor de IA** (Art. 33 + Res. 19/2024, cláusulas-padrão, período de graça encerrado em ago/2025): identificada como exposição real, **não aprofundada**. Provável requirement próprio ou M9.

---

## Sources

**Primárias (texto de lei / autoridade) — base das afirmações `[LEI]`:**
- [Art. 18 LGPD — texto integral](https://lgpd-brasil.info/capitulo_03/artigo_18)
- [Art. 19 LGPD — texto integral (15 dias; formato simplificado imediato; §3º cópia eletrônica)](https://lgpd-brasil.info/capitulo_03/artigo_19)
- [Art. 20 LGPD — texto integral (§3º VETADO)](https://lgpd-brasil.info/capitulo_03/artigo_20)
- [Art. 16 LGPD — hipóteses de conservação](https://lgpd-brasil.info/capitulo_02/artigo_16)
- [Art. 7º LGPD — bases legais (V contrato; VI exercício regular de direitos)](https://lgpd-brasil.info/capitulo_02/artigo_07)
- [ANPD — Direito dos Titulares (página oficial)](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares)
- [Serpro/LGPD — Congresso mantém o veto ao "por pessoa natural" do Art. 20 (02/10/2019)](https://www.serpro.gov.br/lgpd/noticias/2019/congresso-aprecia-veto-ao-artigo-20-da-lgpd)
- [Resolução CD/ANPD nº 19/2024 — Transferência Internacional (ANPD)](https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024)
- [ANPD — Mapa de Temas Prioritários 2026-2027 e Agenda Regulatória](https://www.gov.br/anpd/pt-br/assuntos/noticias/anpd-publica-mapa-de-temas-prioritarios-para-o-bienio-2026-2027-e-atualiza-agenda-regulatoria-2025-2026)
- [ANPD — Tomada de Subsídios 02/2024, Direitos dos Titulares](https://www.gov.br/anpd/pt-br/acesso-a-informacao/participacao-social/outras-acoes/documentos/ts_02-_2024__contribuicoes.pdf)
- [Lei 9.029/1995 — práticas discriminatórias na admissão (LexML)](https://www.lexml.gov.br/urn/urn:lex:br:federal:lei:1995-04-13;9029)

**Doutrina / prática brasileira — base das `[MERCADO]` e `[DOUTRINA]`:**
- [Migalhas — O tratamento dos currículos na LGPD](https://www.migalhas.com.br/depeso/363808/o-tratamento-dos-curriculos-na-lgpd)
- [ConJur — Adequação à LGPD na seleção de candidatos a emprego](https://www.conjur.com.br/2020-set-24/pratica-trabalhista-adequacao-lgpd-recrutamento-selecao-candidatos-emprego/)
- [ConJur — Impactos da LGPD nas relações de trabalho](https://www.conjur.com.br/2021-fev-11/pratica-trabalhista-impactos-lgpd-relacoes-trabalho/)
- [ConJur — Importância da revisão humana das decisões automatizadas na LGPD](https://www.conjur.com.br/2019-set-09/constituicao-poder-importancia-revisao-humana-decisoes-automatizadas-lgpd/)
- [IDP — Artigo 20 da LGPD: a revisão de decisões automatizadas funciona?](https://blog.idp.edu.br/direito-digital/artigo-20-lgpd-revisao-decisoes-automatizadas/)
- [Migalhas — Direito à explicação sobre decisões automatizadas](https://www.migalhas.com.br/depeso/432132/direito-a-explicacao-sobre-decisoes-automatizadas)
- [Guia Trabalhista — Guarda de documentos trabalhistas e prazos](https://www.guiatrabalhista.com.br/guia/guarda_documentos.htm)
- [Solides — LGPD no recrutamento e seleção](https://blog.solides.com.br/lgpd-no-recrutamento-e-selecao/)
- [lgpdbrasil — 5 cuidados no processo de seleção de novos colaboradores](https://lgpdbrasil.com.br/lgpd-5-cuidados-no-processo-de-selecao-de-novos-colaboradores/)

**Produtos analisados:**
- [Gupy — Portal de Privacidade](https://www.gupy.io/lgpd) · [Gupy — Como excluir meus dados (10 dias / 5 anos de inatividade)](https://suporte-candidatos.gupy.io/s/article/Como-Excluir-meus-Dados-na-Gupy?language=pt_BR) · [Gupy — LGPD, base legal do banco de talentos](https://support-candidates.gupy.io/hc/pt-br/articles/1260805926450-Lei-Geral-de-Prote%C3%A7%C3%A3o-de-Dados-LGPD)
- `[GDPR-ANALOGIA]` [Greenhouse — Configure a data retention rule](https://support.greenhouse.io/hc/en-us/articles/360002418112-Configure-a-data-retention-rule) · [Greenhouse — Delete candidates' personal data in bulk](https://support.greenhouse.io/hc/en-us/articles/360035611911-Delete-candidates-personal-data-in-bulk) · [Greenhouse — Legal basis options](https://support.greenhouse.io/hc/en-us/articles/360042142612-Legal-basis-options)
- `[GDPR-ANALOGIA]` [Lever — Anonymizing candidate data](https://help.lever.co/hc/en-us/articles/20087348321565-Anonymizing-candidate-data) · [Lever — Configuring GDPR settings](https://help.lever.co/hc/en-us/articles/20087339443101-Configuring-General-Data-Protection-Regulation-GDPR-settings)
- `[GDPR-ANALOGIA]` [DPO Centre — AI and Article 22: the need for meaningful human review (WP251; SCHUFA C-634/21)](https://www.dpocentre.com/blog/ai-and-article-22-the-need-for-meaningful-human-review/)

**Fonte rejeitada (registrada para não ser reintroduzida):**
- `aeomaps.com.br/base/artigo/lgpd-prazos-resposta-titulares-2026/` — atribui à Resolução CD/ANPD nº 19/2024 a fixação de formatos de portabilidade (JSON/CSV) e à Res. 2/2022 uma orientação sobre "prazo razoável". **Ambas as atribuições são falsas** (a 19/2024 é transferência internacional; a 2/2022 trata de agentes de pequeno porte). Conteúdo aparentemente gerado por IA. **Não citar.**

---
*Feature research for: LGPD-OPS num ATS brasileiro (M8 / v8.0)*
*Researched: 2026-07-29*
*Texto de lei verificado verbatim contra ≥2 fontes independentes, incl. gov.br/anpd. Normas de mercado e números de retenção são MEDIUM e estão explicitamente rotulados como convenção, não lei.*
