# cadastro-de-vaga

Plugin do Claude Code que transforma um **descritivo de cargo** (PDF ou texto) numa **vaga
completa** no ATS da Beauty Smile: campos estruturados, corpo do anúncio, seções extras,
rubrica de avaliação da IA e as perguntas da Etapa 1 — entregues como **migration SQL
versionada**.

## Por que ele existe

O projeto não tem tela de criação de vaga. `/rh/vagas/nova` existe como rota, mas
`CriarEditarVagaPage` lê `vagaId` de `useParams` — que naquela rota é sempre `undefined` — e os
handlers de salvar caem em «Salve a vaga primeiro». Não há mutation de criação.

Consequência medida: vaga nasce por `INSERT` direto, e **9 de 12 vagas ficaram com `created_by`
nulo**. Isso quebra o escopo de trabalho do recrutador inteiro, porque
`vagas.created_by = auth.uid()` gateia revisão de redação, avaliação de entrevista, leitura de
decisão final e reprocessamento. As 6 perguntas existentes têm o mesmo defeito.

Este plugin substitui o `INSERT` ad-hoc por um artefato: uma migration versionada, com o autor
resolvido e **provado** — o bloco aborta em vez de gravar `NULL` calado.

## O que ele entrega

Dois textos com propósitos opostos, e nunca um só:

- **o anúncio** — atrai o candidato, já nas marcas que o renderizador `TextoRico` entende;
- **a rubrica** (`rubrica_ia`) — avalia o candidato, com âncoras BARS, e **nunca manda rejeitar**.

Mais as perguntas da Etapa 1 (em `perguntas_formulario`, com `created_by`), os pesos de
avaliação, os testes aplicáveis e as seções extras.

## Componentes

| Componente | Arquivo |
|---|---|
| Skill | `skills/cadastro-de-vaga/SKILL.md` |
| Comando | `/cadastrar-vaga [pdf ou texto]` |
| Validador (portão) | `skills/cadastro-de-vaga/scripts/validar-payload.mjs` |
| Prova do portão | `skills/cadastro-de-vaga/tests/provar-portao.mjs` |

As referências (`skills/cadastro-de-vaga/references/`) carregam sob demanda:

- `mapa-de-visibilidade.md` — quem lê cada coluna de `vagas`, e como remedir;
- `schema-e-migration.md` — payload, CHECKs, template da migration, via de apply;
- `texto-rico.md` — o contrato fechado do renderizador de markdown;
- `rubrica-ia.md` — como escrever a rubrica, com uma real de produção como gabarito;
- `perguntas-etapa1.md` — blocos, tipos e os limites do `publish_vaga`.

## Instalação

```bash
/plugin marketplace add ./plugins/cadastro-de-vaga
/plugin install cadastro-de-vaga@beauty-smile-dev
# reinicie o Claude Code
```

Para testar sem instalar:

```bash
claude --plugin-dir ./plugins/cadastro-de-vaga
```

## Uso

```
/cadastrar-vaga ~/Downloads/Descritivo_Cargo_SDR_Beauty_Smile_v3_brand.pdf
```

Ou simplesmente peça: *"cadastra essa vaga aí"* com o descritivo em mãos — a skill dispara pela
descrição.

## Pré-requisitos

- Rodar a partir da **raiz do repositório** — o plugin usa `p46apply.cjs` e escreve em
  `supabase/migrations/`.
- Token do Supabase no Keychain (serviço "Supabase CLI", conta "supabase") ou em
  `SUPABASE_ACCESS_TOKEN`. **A senha do banco não é necessária.**

## O portão

O validador não é conselho. Ele confere os CHECKs do banco, os portões do `publish_vaga`, as
marcas que o renderizador conhece, o teto de 5 competências da rubrica e a presença do autor.

E o portão é provado por execução, nas duas metades que importam:

```bash
node skills/cadastro-de-vaga/tests/provar-portao.mjs
```

1. o payload-gabarito — a vaga real, transcrita à mão e revisada com o operador — passa
   **limpo**, provando que o portão não reprova trabalho correto;
2. **36 mutações deliberadas são todas pegas**, provando que ele ainda é capaz de falhar.

Ao acrescentar uma regra ao validador, acrescente a mutação correspondente. Uma regra sem
mutação é uma regra que ninguém sabe se funciona.

## Limites conhecidos

- **Não publica a vaga.** Ela nasce `rascunho`; publicar é ato humano separado.
- **Não marca opção como `knockout`.** Isso rejeita candidatura na inscrição e é decisão do
  operador, não da máquina.
- **`secoes_extras` ainda não é renderizado** na página da vaga. O plugin preenche a coluna e
  avisa que o conteúdo fica invisível até a renderização entrar.
