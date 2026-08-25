---
description: Cadastra vaga, ou cria as perguntas da Etapa 1
argument-hint: [PDF/descritivo, ou o slug de uma vaga que já existe]
---

Siga a skill `cadastro-de-vaga` — leia o `SKILL.md` dela antes de qualquer outra coisa. Ela
traz o mapa de visibilidade dos campos, o contrato do renderizador de markdown, os portões do
`publish_vaga` e as regras da rubrica.

Entrada: $ARGUMENTS

## Primeiro, decida o modo

| O que veio | Modo | O que fazer |
|---|---|---|
| um descritivo de cargo (PDF, `.docx` ou texto colado) | `vaga-nova` | cria a vaga inteira: campos, anúncio, seções extras, rubrica, pesos, testes e perguntas |
| o slug ou o nome de uma vaga que **já existe** | `perguntas` | só acrescenta as perguntas da Etapa 1, continuando a numeração |
| um slug **e** o operador disse que prefere colar na tela | `texto` | imprime os blocos prontos no chat, sem tocar no banco |
| nada | — | pergunte qual dos três, e peça o descritivo ou o slug |

No modo `perguntas`, **ofereça o modo `texto`** antes de emitir SQL: desde 2026-08-24 a tela de
configuração lê e grava perguntas e rubrica com `created_by`, então colar é caminho legítimo.
A migration continua preferível quando a **rubrica** muda — ela decide sobre gente e o rastro
versionado vale a cerimônia. Para vaga nova não há escolha: a tela não cria vaga.

Na dúvida, confirme antes de trabalhar — vaga já existente com rubrica escrita à mão não deve
ser reescrita por engano:

```bash
node p46apply.cjs sql "select slug, status, rubrica_ia is not null as tem_rubrica,
  (select count(*) from public.perguntas_formulario p where p.vaga_id = v.id) as perguntas
  from public.vagas v where deleted_at is null order by status, slug"
```

## Depois, execute o fluxo da skill sem pular etapa

1. resolva o autor (`created_by`) — sem ele, pare;
2. leia o descritivo **inteiro** antes de perguntar qualquer coisa (no modo `perguntas`, leia a
   vaga que já está no banco: título, `sobre_cargo`, requisitos e a rubrica existente);
3. faça **uma** rodada de perguntas com tudo que ficou ambíguo, de uma vez, com `AskUserQuestion`;
4. monte o payload e rode o validador — é portão, não sugestão;
5. mostre o que decide sobre gente e **espere aprovação explícita**: a rubrica no modo
   `vaga-nova`, as perguntas no modo `perguntas`;
6. emita a migration versionada — vaga nova nasce `rascunho`;
7. aplique só depois do OK, conferindo o md5 e provando que `created_by` não ficou nulo;
8. termine com a **conferência visual** da página renderizada.

Publicar a vaga não faz parte deste comando.

⚠ No modo `perguntas`, confira se a rubrica existente da vaga faz alguma ressalva sobre um
campo que o formulário **não coletava**. Se a pergunta nova passa a coletá-lo, essa ressalva
ficou desatualizada e precisa ser revista junto — senão a rubrica perdoa uma ausência que
deixou de ser falha do sistema.
