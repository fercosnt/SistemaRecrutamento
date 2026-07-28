# Phase 8: Inscrição & Knock-out (Etapa 1) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-07
**Phase:** 8-inscri-o-knock-out-etapa-1
**Areas discussed:** Form LGPD-clean + CPF legado, Qualificação vs perguntas_formulario, Mecânica da auto-rejeição, Knockouts padrão + msg candidato

---

## Form LGPD-clean + CPF legado

### Onde vive o form de inscrição LGPD-clean da Etapa 1?
| Option | Description | Selected |
|--------|-------------|----------|
| Rework do /cadastro + extras na candidatura | candidatos LGPD-clean (remove cpf/genero); candidatura por-vaga adiciona campos contextuais | |
| Form de inscrição único por-vaga (feature nova) | `features/inscricao/` coleta tudo num fluxo único | |
| Você decide | planner escolhe (camada M2 limpa sobre M1, menor blast-radius) | ✓ |

**User's choice:** Você decide → registrado como D-01 [REC].

### O que fazer com o CPF já coletado?
| Option | Description | Selected |
|--------|-------------|----------|
| Nullable + parar de coletar/exibir | reversível, menor blast-radius | |
| Drop da coluna cpf | minimização forte, irreversível | |
| Você decide | planner escolhe com base no dado/consumidores | ✓ |

**User's choice:** Você decide → registrado como D-02 [REC] (lean nullable).

### Chave de unicidade após remover CPF?
| Option | Description | Selected |
|--------|-------------|----------|
| Email como chave única | dedup por email (já normalizado) | ✓ |
| Email + telefone | email + telefone secundário | |
| Você decide | researcher confirma o RPC atual | |

**User's choice:** Email como chave única → **D-03 [LOCKED]**.

### Como o Zod rejeita campos proibidos (client+server)?
| Option | Description | Selected |
|--------|-------------|----------|
| Zod .strict() server + allowlist + grep CI | defesa em profundidade, fail-closed | |
| Allowlist sem strict | ignora extras silenciosamente | |
| Você decide | planner escolhe seguindo padrão das EFs M1 | ✓ |

**User's choice:** Você decide → registrado como D-04 [REC] (lean .strict()).

---

## Qualificação vs perguntas_formulario

### Como a qualificação se relaciona com perguntas_formulario?
| Option | Description | Selected |
|--------|-------------|----------|
| Um contêiner (perguntas_formulario) + jsonb derivado | source of truth relacional; jsonb = snapshot | |
| Dois contêineres (jsonb define qualif. + perguntas_formulario p/ knockout) | literal ao PRD, dois blocos | |
| Você decide | researcher confirma PRD §8.2/§8.5 | ✓ |

**User's choice:** Você decide → registrado como D-07 [REC] (lean um contêiner + jsonb derivado, puxado por D-06).

### Knockout questions: relação com qualificação no que o candidato vê?
| Option | Description | Selected |
|--------|-------------|----------|
| Mesmas perguntas, opção decide | uma opção tag=knockout numa pergunta de qualificação | ✓ |
| Bloco de knockout separado | bloco eliminatório visualmente separado | |
| Você decide | planner escolhe | |

**User's choice:** Mesmas perguntas, opção decide → **D-06 [LOCKED]**.

### Onde gravar as respostas da qualificação?
| Option | Description | Selected |
|--------|-------------|----------|
| respostas_formulario (reusa Phase 4) | uma linha por pergunta; F10 lê dali | |
| jsonb em candidaturas | snapshot self-contained | |
| Você decide | planner escolhe coerente com arquitetura | ✓ |

**User's choice:** Você decide → registrado como D-08 [REC] (lean respostas_formulario).

---

## Mecânica da auto-rejeição

### Onde roda o check de knockout?
| Option | Description | Selected |
|--------|-------------|----------|
| Dentro do submit RPC atual (atômico, síncrono) | estende submit_candidatura_atomic | |
| Trigger PL/pgSQL no INSERT | desacoplado, camada extra | |
| Você decide | researcher confirma o ponto de inserção | ✓ |

**User's choice:** Você decide → registrado como D-10 [REC] (lean dentro do RPC).

### Estado da candidatura quando knockada?
| Option | Description | Selected |
|--------|-------------|----------|
| etapa_atual='inscricao' + status='rejeitado' | literal ao criterion #3 | |
| etapa_atual='rejeitado' (terminal) | usa terminal do enum | |
| Você decide | planner concilia criterion #3 + Phase 6 | ✓ |

**User's choice:** Você decide → registrado como D-11 [REC] (lean inscricao+rejeitado, literal ao criterion).

### Onde gravar motivo + opcao_knockout_id?
| Option | Description | Selected |
|--------|-------------|----------|
| Colunas novas em candidaturas | motivo_rejeicao + opcao_knockout_id | |
| Só em historico + feedback_rejeicao | sem colunas novas | |
| Você decide | planner escolhe | ✓ |

**User's choice:** Você decide → registrado como D-12 [REC] (lean colunas novas, literal ao criterion).

### Como a linha de auditoria entra em historico_candidatura?
| Option | Description | Selected |
|--------|-------------|----------|
| RPC grava historico direto (mesma txn) | INSERT explícito, ator=NULL | |
| Reusa o trigger avancar_etapa() via UPDATE | reusa maquinaria Phase 6 | |
| Você decide | planner escolhe coerente com trigger Phase 6 | ✓ |

**User's choice:** Você decide → registrado como D-13 [REC] (lean RPC grava direto).

---

## Knockouts padrão + msg candidato

### Como os 2 knockouts padrão são semeados?
| Option | Description | Selected |
|--------|-------------|----------|
| Via cargoTemplates.ts (estende Phase 7) | template copia perguntas/tags pra vaga | |
| Seed migration no banco | encaixa mal no modelo per-vaga | |
| Você decide | planner escolhe coerente com Phase 7 | ✓ |

**User's choice:** Você decide → registrado como D-14 [REC] (lean cargoTemplates.ts).

### Onde o candidato vê a mensagem de auto-rejeição?
| Option | Description | Selected |
|--------|-------------|----------|
| Inline pós-submit + persiste no /perfil | dupla visibilidade | |
| Só no dashboard /perfil | menos UI nova | |
| Você decide | planner escolhe seguindo UX do PRD | ✓ |

**User's choice:** Você decide → registrado como D-16 [REC] (lean inline + persiste).

### Tom/conteúdo da mensagem padrão de knockout?
| Option | Description | Selected |
|--------|-------------|----------|
| Neutra, sem expor o critério | LGPD-conservadora; explicação detalhada é F15 | ✓ |
| Transparente sobre o critério objetivo | expõe o requisito não atendido | |
| Você decide | Fernando/planner define | |

**User's choice:** Neutra, sem expor o critério → **D-15 [LOCKED]**.

---

## Claude's Discretion

Áreas que o Fernando delegou ("você decide") — registradas como **[REC]** no CONTEXT.md
com direção recomendada, a confirmar pelo researcher contra PRD/código vivo:
- Onde mora o form de inscrição (rework /cadastro vs feature nova) — D-01.
- Destino do CPF legado (nullable vs drop) + se `genero` também sai — D-02.
- Mecanismo de enforcement de campos proibidos (Zod .strict()) — D-04.
- Arquitetura qualificação (um contêiner + jsonb derivado vs dois contêineres) — D-07.
- Store das respostas de qualificação — D-08.
- Limite ≤10/≤1 aberta no Publicar — D-09.
- Toda a mecânica da auto-rejeição (RPC, estado, colunas, historico) — D-10..D-13.
- Seed dos knockouts padrão + parametrização do "presencial SP" — D-14.
- Visibilidade da mensagem — D-16.

## Deferred Ideas

- Direito à explicação detalhada (LGPD Art. 20) + revisão por pessoa natural — Phase 15.
- Snapshot mensal de bias / regra 4/5 EEOC — Phase 15 (LGPD-03).
- Lint/grep de strings proibidas no CI — primariamente Phase 9 (LGPD-04).
- score_match + painel RH + trigger de IA — Phase 10 (TRIAGEM).
- Política de purga/anonimização do CPF legado — pós-V1.
- Rework completo do /cadastro como feature coesa — candidato a Phase 16.
