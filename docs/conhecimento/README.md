# Knowledge Base — RAG operacional do Sistema de Recrutamento

Esta pasta agrupa **conhecimento curado** que alimenta as Edge Functions de IA do M2 (Funil RH). Diferente de `docs/prds/` (especificações de O QUE construir), aqui está o **conteúdo de domínio** que a IA consulta em runtime para avaliar candidatos com base científica e contexto Beauty Smile.

## Estrutura

```
docs/conhecimento/
├── README.md                      ← este arquivo
├── big-five/                      ← Big Five (IPIP-NEO-120 PT-BR)
│   ├── PESQUISA-*.md              ← deep research consolidada
│   ├── fontes/                    ← item bank JSON + PDFs acadêmicos
│   ├── (a criar) templates-devolutiva.md
│   ├── (a criar) interpretacao-resultados.md
│   └── (a depositar) materiais Fernando — teste validado, resumo curso
├── icar60/                        ← ICAR60 (cognitivo presencial)
│   ├── PESQUISA-*.md
│   └── fontes/
├── sjt/                           ← Work Sample / SJT por cargo
│   ├── PESQUISA-*.md
│   └── fontes/
├── fit-cultural/                  ← Redação cultural Beauty Smile
│   └── (consome ../prds/CULTURA-BEAUTY-SMILE-INPUT.md + fit-cultural-banco-itens-v1.md)
└── prompts/                       ← Library de prompts versionados
    ├── PESQUISA-prompt-library-ats.md
    ├── AUDITORIA-LGPD-LOGGING-VERSIONING.md
    ├── templates/                 ← 8 templates prontos (1 por uso)
    └── fontes/                    ← best practices, bias mitigation, LGPD
```

## Como as Edge Functions consomem isso

```
Edge Function (ex: avaliar-bigfive-devolutiva):
  1. Carrega prompt versionado de docs/conhecimento/prompts/templates/06-*.md
  2. Carrega contexto científico de docs/conhecimento/big-five/*.md
  3. Carrega templates de devolutiva por dimensão
  4. Recebe scores do candidato → injeta no prompt
  5. Chama Claude Sonnet com contexto montado
  6. Valida output via Zod schema (00-shared-zod-schemas.ts)
  7. Loga prompt_version + model_version + custo + LGPD audit
```

## Versionamento

- Tudo aqui vive no Git — atualização = PR + review
- Prompts versionados: nome do arquivo carrega versão (ex: `04-interview-guide-v1.md` futuro `v2`)
- Mudança em prompt → bump de versão + log de mudança no header do arquivo
- Edge Function loga `prompt_version` em toda chamada → auditoria LGPD Art. 20 consegue reproduzir decisão histórica

## Princípios

1. **RAG over fine-tuning** — atualizar conhecimento = editar markdown, não retreinar modelo
2. **Conhecimento separado de prompt** — mesmo prompt pode usar contextos diferentes (ex: Big Five vs DISC reusam template de devolutiva)
3. **Fontes preservadas** — cada subpasta `fontes/` mantém pesquisas originais para auditoria + reuso
4. **Templates versionados** — quebrar prompt sem versão = perder reprodutibilidade
5. **LGPD-by-default** — todo template tem seção de logging + bias check + privacy notes

## Documentos correlatos (fora desta pasta)

- `docs/prds/m2-funil-rh/` — PRDs que ESPECIFICAM como construir as features que consomem esta knowledge base
- `docs/prds/PRD-MASTER-sistema-recrutamento.md` — visão geral do sistema
- `docs/prds/CULTURA-BEAUTY-SMILE-INPUT.md` — input cultural reusado em fit-cultural
- `docs/prds/fit-cultural-banco-itens-v1.md` — banco de itens fit cultural
- `Pesquisas/sistema-avaliacao-candidatos-recrutamento/` — pesquisas brutas originais (fora do repo, não commitadas)
